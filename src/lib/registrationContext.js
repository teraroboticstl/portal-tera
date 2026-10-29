import { createContext } from 'react';

// Only the current actor's greeting; never age, narratives or PDI proposal.
export const RegistrationProfileContext = createContext(null);
