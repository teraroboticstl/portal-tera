# Etapa 10 — cadastro e PDI

Criado em 21/10/2026 a partir da solicitação e respostas do usuário. Este documento não inventa fases 9.x ou 10.2 em diante e não substitui o plano oficial Etapa 3 (Prompts 0–8).

## Fase 10.1 autorizada

Recadastrar integrantes sem apagar contas, trajetórias, perfis existentes ou PDIs. Somente a Área Interna terá requisito de conclusão; público e AVA conservam seu comportamento. Administradores também preenchem o cadastro, sem perda de seu papel. Modalidades declaradas não promovem acesso.

Coletar nome escolhido, idade atual em anos (não data de nascimento), motivo de ingresso, modalidades, áreas, experiências anteriores, contribuição pretendida, temporada de referência declarada, objetivos e competências desejadas. A temporada é explícita, sem inferir modalidade ou temporada corrente de registros históricos.

A conclusão salva atomicamente o cadastro privado e uma proposta inicial de PDI com objetivos/competências declarados, sem pontuação ou avaliação gerada por IA. Uma proposta pode listar várias modalidades; não substituir, associar por nome nem duplicar PDIs FTC/FRC existentes. A proposta fica pendente de revisão; aprovação/conversão em PDI definitivo é trabalho posterior.

## Privacidade e identidade

Usar sempre auth.uid() no servidor. Cadastro e proposta ficam na mesma linha privada, fora de profiles e das fontes compartilhadas do ULTRON. Leitura: titular ou liderança/mentores já reconhecidos por ava_identity; o campo role=mentor isolado não comprova mentoria, pois o legado também o usa para membros integrados. Não alterar papéis, grants ou RLS das tabelas existentes. Somente o nome escolhido do titular é passado à saudação local do ULTRON.

O bloqueio é um requisito de navegação da aplicação, não revogação de sessão ou nova política sobre APIs/dados antigos. As APIs continuam sujeitas à autorização existente. Garantir bloqueio de todo acesso por API exigiria projeto separado de regras RLS, incompatível com alterar permissões sem nova decisão.

## Implantação por etapas

Instalar schema aditivo primeiro, mantendo a ativação desligada. Preparar status pendente para todos os perfis no armazenamento privado, preservando dados antigos; contas futuras entram pendentes por ausência de conclusão. Depois de backup real do banco, testes isolados e leitura do schema efetivo, ativar a configuração versionada por procedimento administrativo separado. Não há ativação automática nesta implementação.

Ausência da RPC ou falha na verificação bloqueia a Área Interna com mensagem genérica e opção de tentar novamente/sair; não apresenta os filhos protegidos. Por isso não publicar o frontend antes da migração compatível. Desligar a ativação devolve o acesso de navegação anterior sem remover os cadastros.

## Pré-requisitos herdados do plano oficial

Revalidar baseline (0), proteger CAD e OAuth (1–2), instalação/build (3), integridade operacional (4), UUID/privacidade/evidências (5). A proposta inicial não depende de aplicar backfill de PDI. Consulta ULTRON permanece read-only conforme 6; alinhamento 7 é preservado. Release só após os critérios aplicáveis do 8, sem afirmar que a matriz de cinco sessões reais já foi validada.

## Aceite

Usuário antigo encontra formulário na Área Interna quando a fase está ativa; somente conclusão persistida libera os filhos. Site público/AVA inalterados. Idempotência não duplica proposta; falha de validação não salva parcialmente; dados de outra pessoa não são expostos; papel de membro integrado sem flag de mentor não concede leitura; rejeitar user_id/roles no payload; nome escolhido aparece escapado na saudação; PDIs e histórico permanecem intactos. Testar em PostgreSQL isolado e interface, sem dados reais de menores.
