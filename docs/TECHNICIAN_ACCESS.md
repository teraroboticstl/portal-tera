# Técnicos

Nível solicitado em 06/11/2026: **Técnico** tem os mesmos poderes de administrador, incluindo todas as modalidades, PDIs e dados restritos, usuários, permissões, conteúdos e configurações. Não é um mentor comum nem um acesso limitado à modalidade.

No Painel Admin → Usuários → Gerenciar nível, selecionar Técnico e Autorizado. Atribuição e revogação usam a mesma RPC administrativa, autenticação, proteção das contas de recuperação e auditoria existentes. Apenas administradores atuais (incluindo técnicos autorizados) podem atribuir esse poder. O usuário não pode se promover. Cadastros pendentes/rejeitados não recebem privilégios administrativos.

Para preservar todas as verificações existentes do banco, APIs e frontend, técnicos autorizados continuam representados internamente por `profiles.role/member_role = admin`; `portal_user_access.access_level = technician` distingue o nível exibido. Não adicionar e-mail a listas de administradores seed, não criar senha, conta ou projeto duplicado. Instalar a migration não promove automaticamente nenhuma conta.

A conta explicitamente indicada pelo administrador já tinha poderes administrativos (perfil admin e nível leader), com correspondência única e e-mail autenticado confirmado. A mudança de identificação para Técnico conserva esses poderes. Não redefine senha nem modifica PDIs, registros, modalidades ou matrículas existentes.

Rollout: backup cifrado dos acessos/funções, teste isolado da migration, aplicação da estrutura, publicação compatível e atribuição pelo painel existente. Rollback retorna o rótulo ao nível leader e preserva privilégios e registros. Teste SQL cobre administração real, acesso a dados privados, atribuição por outro técnico, autopromoção negada, recuperação, pendência/rejeição, rebaixamento e rollback; não representa um login do usuário real.
