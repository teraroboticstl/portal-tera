# AVA Portal Tera

Referências: especificação AVA de outubro de 2026 e PROJETO SUSTAIN fornecidos pelo responsável do portal.

Reutilização: Supabase Auth/Google e profiles para identidade; AuthContext e authShim para navegação; componentes Tabs/Button/Dialog já existentes; endpoint multipart /api/media/upload, cliente Google Drive e streaming /api/media/:id para arquivos. O AVA usa uma pasta privada própria dentro do mesmo acervo. Não há outro login, storage paralelo ou dependência Base44.

Autorização: portal_user_access mantém autorização AVA independente do status interno legado. Novas solicitações permanecem pendentes. Aprovação AVA não altera profiles.status. Administradores do portal mantêm administração; colaboradores AVA podem gerir conteúdo, sem promover papéis ou liberar área interna. Somente admin do portal concede escopos e acesso interno. Políticas restritivas adicionais impedem contas externas de ler tabelas internas, sem substituir os limites de autoria existentes. Perfis externos podem ler apenas sua própria identidade. Nenhuma conta existente recebe escopo AVA automaticamente, exceto os privilégios administrativos já existentes.

Dados: trilhas, módulos com blocos tipados/versionados, matrículas, progresso, tentativas de quiz, agenda e inscrições, comunicados e leituras, mídia e auditoria. RPCs transacionais operam com auth.uid; tabelas AVA não permitem escrita direta pelo cliente. A API verifica JWT e usa cliente autenticado. Gabaritos ficam no servidor e não são retornados ao aluno. Visitar uma página não registra conclusão. Conteúdo alterado aumenta versão e invalida critérios anteriores até nova conclusão. Vagas e limites de tentativas são protegidos por bloqueio transacional.

As seis trilhas e os módulos SUSTAIN são criados como rascunhos editoriais, com tópicos reais do documento. Vídeos, apostilas e aulas precisam ser cadastrados e publicados pelo responsável; não são simulados. Certificados ficam reservados na configuração da trilha para uma fase posterior, conforme a especificação MVP. Grupos WhatsApp são links cadastrados pelo admin, nunca criados ou enviados automaticamente.

Implantação: executar a migration 20261007_ava_learning.sql antes de publicar. Ela é aditiva e não apaga dados. Reversão funcional: despublicar trilhas e revogar AVA; rollback de código mantém proteção interna. Não remover políticas restritivas enquanto houver contas externas. Para reverter schema, preservar/exportar tabelas AVA e remover RPCs/tabelas apenas em manutenção aprovada.
