import { toast } from 'sonner';
import { QueryClient, MutationCache } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
  mutationCache: new MutationCache({
    onError: (_error, _variables, _context, mutation) => {
      if (!mutation.options.onError) toast.error('Não foi possível concluir a operação. Confira sua conexão e seu nível de acesso. Seus dados não foram confirmados; confira a lista antes de tentar novamente.');
    }
  }),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});