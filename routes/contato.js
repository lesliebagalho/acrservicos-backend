import express from 'express';
import nodemailer from 'nodemailer';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// Cria transporter nodemailer a partir das configurações salvas no banco ou variáveis de ambiente
async function createTransporter() {
  // Tenta buscar configurações SMTP no banco (chaves iniciando com smtp_)
  try {
    const r = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%'");
    const map = {};
    r.rows.forEach(row => { map[row.key] = row.value; });

    const host = map['smtp_host'] || process.env.SMTP_HOST;
    const port = map['smtp_port'] ? parseInt(map['smtp_port'], 10) : parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = (map['smtp_secure'] ?? process.env.SMTP_SECURE) === 'true';
    const user = map['smtp_user'] || process.env.SMTP_USER;
    const pass = map['smtp_pass'] || process.env.SMTP_PASS;

    console.log('[createTransporter] Config:', { host, port, secure, user: user ? 'OK' : 'VAZIO', pass: pass ? 'OK' : 'VAZIO' });

    if (!host || !user || !pass) {
      console.error('[createTransporter] Credenciais incompletas:', { host: !!host, user: !!user, pass: !!pass });
      return null;
    }

    console.log('[createTransporter] Criando nodemailer com:', { host, port, secure });
    
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 30000,
      socketTimeout: 30000,
    });
  } catch (err) {
    console.error('[createTransporter] Erro ao ler configurações do DB:', err.message);
    // fallback para env
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[createTransporter] Variáveis .env também incompletas');
      return null;
    }
    console.log('[createTransporter] Usando fallback .env');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 30000,
      socketTimeout: 30000,
    });
  }
}

// GET /api/contato/settings — retorna configurações (protegido)
router.get('/settings', verificaToken, async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM settings WHERE key LIKE 'contato_%' OR key LIKE 'smtp_%'");
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    console.error('[Settings] Erro ao buscar:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar configurações' });
  }
});

// PUT /api/contato/settings — salva configurações (protegido)
router.put('/settings', verificaToken, async (req, res) => {
  try {
    const {
      email_destino,
      email_cc,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      smtp_from,
    } = req.body;

    if (!email_destino || typeof email_destino !== 'string' || !email_destino.includes('@')) {
      return res.status(400).json({ erro: 'Email de destino inválido' });
    }

    await query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('contato_email_destino', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [email_destino.trim()]
    );

    const ccValue = (email_cc && typeof email_cc === 'string') ? email_cc.trim() : '';
    await query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('contato_email_cc', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [ccValue]
    );

    // Salva configurações SMTP (opcionais)
    const valuesToSave = [
      ['smtp_host', smtp_host],
      ['smtp_port', smtp_port ? String(smtp_port) : ''],
      ['smtp_secure', smtp_secure ? String(smtp_secure) : 'false'],
      ['smtp_user', smtp_user],
      ['smtp_pass', smtp_pass],
      ['smtp_from', smtp_from],
    ];

    for (const [key, val] of valuesToSave) {
      await query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, (val && typeof val === 'string') ? val.trim() : '']
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Settings] Erro ao salvar:', err.message);
    res.status(500).json({ erro: 'Erro ao salvar configurações' });
  }
});

// POST /api/contato/settings/test-smtp — tenta enviar um email de teste (protegido)
router.post('/settings/test-smtp', verificaToken, async (req, res) => {
  try {
    const { to } = req.body || {};
    
    console.log('[SMTP Test] Iniciando teste...');

    // Buscar credenciais do DB
    const smtpResult = await query("SELECT key, value FROM settings WHERE key LIKE 'smtp_%'");
    const smtpMap = {};
    smtpResult.rows?.forEach(row => { smtpMap[row.key] = row.value; });
    
    console.log('[SMTP Test] Credenciais do DB:', {
      host: smtpMap['smtp_host'] ? 'OK' : 'VAZIO',
      port: smtpMap['smtp_port'] || 'VAZIO',
      user: smtpMap['smtp_user'] ? 'OK' : 'VAZIO',
      pass: smtpMap['smtp_pass'] ? 'OK (****)' : 'VAZIO',
      secure: smtpMap['smtp_secure'],
    });

    const transporter = await createTransporter();
    if (!transporter) {
      console.error('[SMTP Test] Transporter falhou - credenciais incompletas');
      return res.status(503).json({ erro: 'Serviço de email não configurado. Configure SMTP_HOST, SMTP_USER, SMTP_PASS em variáveis de ambiente ou no banco de dados.' });
    }

    console.log('[SMTP Test] Transporter criado com sucesso');

    // busca destino padrão se não informado
    const settingResult = await query("SELECT value FROM settings WHERE key = 'contato_email_destino'");
    const defaultTo = settingResult.rows?.[0]?.value;
    const testTo = (to && typeof to === 'string') ? to : defaultTo;
    if (!testTo) {
      console.error('[SMTP Test] Email de destino não configurado');
      return res.status(400).json({ erro: 'Endereço de destino não informado e não existe configuração padrão.' });
    }

    console.log('[SMTP Test] Enviando para:', testTo);

    const smtpFromRow = await query("SELECT value FROM settings WHERE key = 'smtp_from'");
    let smtpFrom = smtpFromRow.rows?.[0]?.value || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    // Extrai apenas o email se estiver no formato "Nome <email@domain.com>"
    if (smtpFrom && smtpFrom.includes('<') && smtpFrom.includes('>')) {
      smtpFrom = smtpFrom.match(/<([^>]+)>/)?.[1] || smtpFrom;
    }

    console.log('[SMTP Test] From:', smtpFrom);
    
    const mailResult = await transporter.sendMail({
      from: smtpFrom,
      to: testTo,
      subject: '[MID Automação] Teste de Conexão SMTP',
      text: 'Este é um email de teste enviado pelo painel de configurações para verificar a conexão SMTP.',
    });
    
    console.log('[SMTP Test] Email enviado com sucesso:', mailResult.messageId);
    res.json({ ok: true, mensagem: 'Email de teste enviado com sucesso para ' + testTo });
  } catch (err) {
    console.error('[SMTP Test] ERRO:', {
      message: err.message,
      code: err.code,
      responseCode: err.responseCode,
      response: err.response,
      stack: err.stack,
    });
    res.status(500).json({ erro: 'Falha ao enviar email de teste: ' + (err.message || String(err)) });
  }
});

// POST /api/contato — envia email (público)
router.post('/', async (req, res) => {
  try {
    const { nome, empresa, email, telefone, servico, mensagem, tipo } = req.body;

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    // Buscar configurações de email
    const settingResult = await query(
      "SELECT key, value FROM settings WHERE key IN ('contato_email_destino', 'contato_email_cc')"
    );

    const settingsMap = {};
    settingResult.rows.forEach(r => { settingsMap[r.key] = r.value; });

    const emailDestino = settingsMap['contato_email_destino'];
    if (!emailDestino) {
      return res.status(503).json({ erro: 'Email de destino não configurado. Contate o administrador.' });
    }

    const emailCc = settingsMap['contato_email_cc'] || null;

    // Criar transporter a partir do DB ou env
    const transporter = await createTransporter();
    if (!transporter) {
      return res.status(503).json({ erro: 'Serviço de email não configurado. Contate o administrador.' });
    }

    const assunto = tipo === 'orcamento'
      ? `[MID Automação] Novo orçamento solicitado — ${nome.trim()}`
      : `[MID Automação] Nova mensagem de contato — ${nome.trim()}`;

    const linhas = [
      `<h2 style="color:#7a1025;margin:0 0 20px">${tipo === 'orcamento' ? '📋 Novo Orçamento' : '✉️ Novo Contato'}</h2>`,
      `<table style="border-collapse:collapse;width:100%">`,
      `<tr><td style="padding:8px 12px;font-weight:bold;width:140px;border-bottom:1px solid #eee">Nome</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escHtml(nome)}</td></tr>`,
      empresa ? `<tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee">Empresa</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escHtml(empresa)}</td></tr>` : '',
      email ? `<tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee">E-mail</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escHtml(email)}</td></tr>` : '',
      telefone ? `<tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee">Telefone</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escHtml(telefone)}</td></tr>` : '',
      servico ? `<tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee">Serviço</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escHtml(servico)}</td></tr>` : '',
      mensagem ? `<tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;vertical-align:top">Mensagem</td><td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${escHtml(mensagem)}</td></tr>` : '',
      `</table>`,
    ].filter(Boolean).join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e8e8e8;border-radius:8px">
        ${linhas}
        <p style="margin-top:24px;font-size:12px;color:#999">Enviado pelo site acrservicos.com.br</p>
      </div>`;

    // Envia email
    // Busca smtp_from em settings (ou env)
    let smtpFrom = (await query("SELECT value FROM settings WHERE key = 'smtp_from'"))?.rows?.[0]?.value || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    // Extrai apenas o email se estiver no formato "Nome <email@domain.com>"
    if (smtpFrom && smtpFrom.includes('<') && smtpFrom.includes('>')) {
      smtpFrom = smtpFrom.match(/<([^>]+)>/)?.[1] || smtpFrom;
    }
    
    await transporter.sendMail({
      from: smtpFrom,
      to: emailDestino,
      cc: emailCc || undefined,
      replyTo: email || undefined,
      subject: assunto,
      html,
    });

    res.json({ ok: true, mensagem: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('[Contato] Erro ao enviar email:', err.message);
    res.status(500).json({ erro: 'Erro ao enviar mensagem. Tente novamente.' });
  }
});

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default router;
