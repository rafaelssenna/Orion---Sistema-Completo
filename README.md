# Sistema Orion

Sistema interno de gestao de projetos e tarefas.

## Stack Tecnologica

- **Backend**: Python + FastAPI
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Banco de Dados**: PostgreSQL
- **Autenticacao**: JWT

## Estrutura do Projeto

```
orion/
├── backend/           # API FastAPI
│   ├── app/
│   │   ├── api/       # Endpoints REST
│   │   ├── core/      # Seguranca e configuracoes
│   │   ├── models/    # Modelos SQLAlchemy
│   │   ├── schemas/   # Schemas Pydantic
│   │   └── services/  # Logica de negocio
│   └── alembic/       # Migrations
│
└── frontend/          # Next.js
    └── src/
        ├── app/       # Paginas (App Router)
        ├── components/# Componentes React
        ├── hooks/     # Custom hooks
        └── lib/       # Utilitarios
```

## Como Executar

### Backend

1. Criar ambiente virtual:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# ou
source venv/bin/activate  # Linux/Mac
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variaveis de ambiente:
```bash
cp .env.example .env
# Editar .env com suas configuracoes
```

4. Executar migrations:
```bash
alembic upgrade head
```

5. Criar admin inicial:
```bash
python -m scripts.create_admin
```

6. Iniciar servidor:
```bash
uvicorn app.main:app --reload
```

A API estara disponivel em: http://localhost:8000
Documentacao Swagger: http://localhost:8000/docs

### Frontend

1. Instalar dependencias:
```bash
cd frontend
npm install
```

2. Configurar variaveis de ambiente:
```bash
cp .env.local.example .env.local
# Editar .env.local com a URL da API
```

3. Iniciar servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estara disponivel em: http://localhost:3000

## Credenciais Padrao

Apos executar o script de criacao do admin:

- **Email**: admin@orion.com
- **Senha**: admin123

## Deploy

### Backend (Railway)

1. Criar projeto no Railway
2. Adicionar PostgreSQL
3. Configurar variaveis de ambiente
4. Deploy via GitHub

### Frontend (Vercel)

1. Importar projeto no Vercel
2. Configurar NEXT_PUBLIC_API_URL
3. Deploy automatico

## Funcionalidades

### Administrador
- Gerenciar projetos (criar, editar, excluir)
- Gerenciar tarefas
- Gerenciar usuarios
- Visualizar dashboard com estatisticas

### Colaboradores (Programador, Marketing, Administrativo, Designer)
- Visualizar projetos atribuidos
- Gerenciar status das tarefas
- Acompanhar progresso pessoal

## Links de Producao

- **Frontend (Vercel)**: https://orion-sistema-completo.vercel.app
- **Backend (Railway)**: https://orion-backend.railway.app
