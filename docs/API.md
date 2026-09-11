# Integração de API e Funções (API.md)

Este documento aborda a comunicação do frontend do **Portal Tera** com as APIs remotas, detalhando o funcionamento do SDK Base44 e das funções serverless integradas ao projeto.

---

## 🔌 O Cliente Base44

A comunicação central é realizada a partir do arquivo `src/api/base44Client.js`. Nele, o SDK é instanciado de forma a automatizar requisições autenticadas para o backend do ecossistema:

```javascript
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',       // Configurado automaticamente pela plataforma
  requiresAuth: false, // Permite acesso a endpoints públicos antes do login
  appBaseUrl
});
```

---

## ⚡ Chamadas de Entidade (CRUD)

O SDK do Base44 expõe métodos de acesso direto para cada uma das entidades cadastradas em `/base44/entities/` no namespace `base44.entities`. 

### Exemplos Práticos de Consumo

#### 1. Buscar Listagem de Entidades
```javascript
// Recupera a lista completa de logs diários
const dailyLogs = await base44.entities.DailyLog.list();
```

#### 2. Inserir uma Nova Entidade (Create)
```javascript
const novoLog = await base44.entities.DailyLog.create({
  user_id: user.id,
  user_name: user.full_name,
  date: new Date().toISOString().split('T')[0],
  hours_spent: 3,
  completed_tasks: "Finalização do subsistema de garra",
  impediments: "Nenhum",
  next_steps: "Testes físicos em arena",
  category: "FTC"
});
```

#### 3. Atualizar Entidade por ID (Update)
```javascript
await base44.entities.DailyLog.update(logId, {
  hours_spent: 4,
  completed_tasks: "Montagem do subsistema de garra e revisão de engrenagens"
});
```

#### 4. Remover Entidade (Delete)
```javascript
await base44.entities.DailyLog.delete(logId);
```

---

## 🧠 Funções Serverless (Edge Functions)

As lógicas que exigem processamento no servidor (como chaves de API ocultas ou operações pesadas de rede) são alocadas como funções serverless no diretório `/base44/functions/`.

### Exemplo: `ftcTeamLookup` (`/base44/functions/ftcTeamLookup/entry.ts`)

Esta função serverless realiza a busca dinâmica de times da categoria FTC. Ela consome dados de APIs de terceiros ocultando tokens sensíveis de forma segura no lado do servidor.

#### Estrutura de Código de Entrada (`entry.ts`)
```typescript
export default async function(context: any) {
  const { query } = context.req;
  const teamNumber = query.team;
  
  if (!teamNumber) {
    return context.res.json({ error: 'Parâmetro de número do time é obrigatório' }, 400);
  }

  try {
    // Exemplo de integração externa efetuada no backend serverless
    const response = await fetch(`https://ftc-api.firstinspires.org/v2.0/2025/teams?teamNumber=${teamNumber}`, {
      headers: {
        'Authorization': `Basic ${process.env.FIRST_API_KEY}`
      }
    });
    const data = await response.json();
    return context.res.json(data);
  } catch (err) {
    return context.res.json({ error: 'Erro ao buscar dados na FIRST API' }, 500);
  }
}
```

No frontend, a execução dessa função é encapsulada de forma simples e direta pelo SDK:
```javascript
const resultado = await base44.functions.ftcTeamLookup({ team: "12345" });
```

---

## 🌐 Consumo de Configurações Públicas

Antes mesmo de efetuar a autenticação oficial do usuário, a aplicação necessita compreender as parametrizações e restrições públicas definidas para o ecossistema (se a autenticação é obrigatória para o domínio, ou se o usuário não está cadastrado).

Para isto, o arquivo `src/lib/AuthContext.jsx` constrói um cliente Axios puro direcionado aos serviços de infraestrutura pública do Base44:

```javascript
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const appClient = createAxiosClient({
  baseURL: `/api/apps/public`,
  headers: {
    'X-App-Id': appParams.appId
  },
  token: appParams.token, // Token opcional presente na URL/Storage
  interceptResponses: true
});

// Chamada para obter parâmetros públicos do console
const settings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
```
