# MID Automação Backend

Backend API para MID Automação construído com **Node.js**, **Express** e **PostgreSQL**.

## 🚀 Quick Start

### Pré-requisitos
- Node.js 16+ instalado
- PostgreSQL instalado e rodando (local ou cloud)
- npm ou yarn

### Instalação Local

1. **Clone ou navegue para o diretório**
```bash
cd midautomacao-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/midautomacao
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=sua-chave-super-secreta-alterar-em-producao
```

4. **Criar o primeiro admin (seed)**
```bash
npm run seed
```
Cria usuário padrão:
- **Email:** admin@mid.com
- **Senha:** admin123

5. **Inicie o servidor**
```bash
# Desenvolvimento (com auto-reload via nodemon)
npm run dev

# Produção
npm start
```

Servidor rodará em `http://localhost:5000`

## 🔐 Autenticação com JWT

Todas as rotas de dados (CRUD) requerem **JWT token válido**.

### 1️⃣ Fazer Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@mid.com", "senha": "admin123" }'
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@mid.com"
}
```

### 2️⃣ Usar Token em Requisições
Adicione o token no header `Authorization`:

```bash
curl -X GET http://localhost:5000/api/clientes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3️⃣ Resetar Senha (protegido)
```bash
curl -X POST http://localhost:5000/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token>" \
  -d '{ "email": "admin@mid.com", "novaSenha": "nova123" }'
```

**⚠️ Importante:**
- Token expira em **24 horas**
- Sem token = erro 401 Unauthorized
- Senha armazenada com **bcrypt** (nunca em texto plano)

## 📡 API Endpoints

### Clientes
- `GET /api/clientes` - Listar todos
- `GET /api/clientes/:id` - Obter um
- `POST /api/clientes` - Criar novo
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Deletar

### Produtos
- `GET /api/produtos`
- `GET /api/produtos/:id`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`

### Serviços
- `GET /api/servicos`
- `GET /api/servicos/:id`
- `POST /api/servicos`
- `PUT /api/servicos/:id`
- `DELETE /api/servicos/:id`

### Hero Slides
- `GET /api/hero-slides`
- `GET /api/hero-slides/:id`
- `POST /api/hero-slides`
- `PUT /api/hero-slides/:id`
- `DELETE /api/hero-slides/:id`

### Health Check
- `GET /health` - Status do servidor

## 🚄 Deploy no Railway

### 1. Criar conta e projeto no Railway
- Acesse [railway.app](https://railway.app)
- Crie uma nova conta ou faça login
- Crie um novo projeto

### 2. Adicionar PostgreSQL
1. No dashboard do projeto, clique **Add Service**
2. Selecione **PostgreSQL**
3. Railway criará automaticamente o banco de dados com `DATABASE_URL`

### 3. Conectar repositório GitHub
1. Clique **Create** em **New** → **GitHub Repo**
2. Autorize e selecione o repositório `midautomacao-backend`
3. Configure o branch principal (`main`)

### 4. Configurar variáveis de ambiente
No Railway dashboard:
1. Vá para **Variables**
2. Adicione/confirme:
   - `DATABASE_URL` (criado automaticamente pelo PostgreSQL)
   - `NODE_ENV=production`
   - `PORT=5000` (Railway atribui automaticamente)
   - `FRONTEND_URL=https://seu-frontend.vercel.app`

### 5. Deploy automático
- Railway detectará `package.json` e `npm start`
- Deploy acontece automaticamente a cada push em `main`

### URLs geradas
- Railway fornecerá um URL público (ex: `https://midautomacao-backend.up.railway.app`)
- Use esse URL no frontend em lugar de `http://localhost:5000`

## 🔧 Configuração do Frontend

No frontend (Vercel), configure a API baseURL:

```typescript
// Ex. em uma chamada fetch
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://midautomacao-backend.up.railway.app';

const response = await fetch(`${API_URL}/api/clientes`);
```

## 📦 Dependências

- **express** - Web framework
- **pg** - Client PostgreSQL
- **cors** - Suporte para CORS
- **dotenv** - Variáveis de ambiente
- **nodemon** - Auto-reload em dev

## 📝 Estrutura do Projeto

```
midautomacao-backend/
├── server.js          # Arquivo principal
├── db.js              # Configuração e inicialização do BD
├── routes/
│   ├── clientes.js
│   ├── produtos.js
│   ├── servicos.js
│   └── heroSlides.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🛡️ Segurança

- ✅ Validação básica de entrada (Express)
- ✅ Proteção contra SQL Injection (pg prepared statements)
- ✅ CORS configurado para frontend específico
- ⚠️ TODO: Autenticação/autorização
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: Validação mais rigorosa

## 🐛 Troubleshooting

### Erro: "Invalid URL" ou "ERR_INVALID_URL"
Este erro ocorre quando DATABASE_URL é inválido ou vazio.

**Solução:**
1. Verificar `.env` - certifique-se que DATABASE_URL está preenchido
2. Formato correto: `postgresql://user:password@host:5432/dbname`
3. Railway: DATABASE_URL é criado automaticamente pelo serviço PostgreSQL
   - Vá para **Variables** no dashboard do Railway
   - Confirme que `DATABASE_URL` existe e não está vazio
4. Teste local:
```bash
# Verificar se DATABASE_URL está definido
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows

# Testar conexão
psql $DATABASE_URL
```

### Erro de conexão PostgreSQL
- Verifique se PostgreSQL está rodando
- Confirme credenciais em `.env`
- Se usar fallback (DATABASE_HOST, etc), preencha todos os valores:
  ```env
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=midautomacao
  DATABASE_USER=postgres
  DATABASE_PASSWORD=password
  ```

### Porta 5000 já em uso
```bash
# Mude a porta em .env
PORT=5001
npm start
```

### Erro CORS - "Access to XMLHttpRequest blocked"
Confirme que `FRONTEND_URL` em `.env` corresponde ao URL do seu frontend:
```env
# Local
FRONTEND_URL=http://localhost:3000

# Vercel
FRONTEND_URL=https://seu-frontend.vercel.app
```

### Módulos não encontrados
```bash
# Reinstale dependências
rm -rf node_modules package-lock.json
npm install
```

### Railway deployment não atualiza
- Confirme que código foi feito push para `main` branch
- Verifique **Deployments** tab no Railway dashboard
- Logs disponíveis em **Logs** tab para diagnosticar problemas

## 📚 Docs adicionais

- [Express.js Docs](https://expressjs.com)
- [Node Postgres](https://node-postgres.com)
- [Railway Docs](https://docs.railway.app)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

**Desenvolvido para MID Automação** | 2026
