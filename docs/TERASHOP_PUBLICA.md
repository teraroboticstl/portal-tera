# TeraShop pública

A página existente `/TeraShop` reutiliza Product/products, o cadastro administrativo e a mídia institucional. O menu público (desktop/celular) e o rodapé passam a incluir Loja. Nenhuma tabela, permissão, conta, cobrança ou provedor de pagamento foi criado.

A vitrine consulta até 200 produtos disponíveis, permite busca/categorias reais, trata erro e catálogo vazio, formata preço numérico/string e abre detalhes acessíveis com rolagem móvel. Produtos indisponíveis não são exibidos. Alterações de produtos no ADM invalidam o cache da vitrine no mesmo navegador; outras sessões atualizam ao recarregar/voltar ao foco.

O telefone fictício foi removido. `VITE_TERASHOP_WHATSAPP_NUMBER`, se configurada, é um contato comercial PÚBLICO e gera somente um link wa.me com produto/valor para revisão e envio manual pelo comprador. Não usar telefone privado de membro sem autorização para publicação. Sem contato comercial configurado, aparece “Consultar a equipe”, direcionando ao contato público existente. Isso não registra pagamento nem garante pedido/estoque/entrega. Não ativar integração financeira sem definição do responsável, provedor e regras de venda.

Pendência de lançamento: confirmar o canal de atendimento ou integração de pagamento desejado e o contato comercial autorizado. Não inventar telefone, chave Pix, condições de entrega ou produtos.

Testes: preços vindos do banco, produtos indisponíveis, filtros/categorias, URL segura sem telefone fictício, renderização real da página com dados fictícios, erro sem mostrar cache obsoleto, carregamento, estado vazio, detalhes e texto escapado. Dados de teste não são produtos publicados.
