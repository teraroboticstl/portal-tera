import React from 'react';
import { Bot } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { RegistrationProfileContext } from '@/lib/registrationContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import UltronReadOnlySearch from '@/components/internal/UltronReadOnlySearch';
import '@/pages/AVA.css';

// Keep the established floating entry point; replace the unimplemented LLM shim.
export default function TerAIChat({ profileUser } = {}) {
  const { user, isAuthenticated } = useAuth();
  const registration = React.useContext(RegistrationProfileContext);
  if (!isAuthenticated || user?.portal_internal !== true) return null;
  return <Dialog>
    <DialogTrigger asChild>
      <Button aria-label="Abrir ULTRON" title="ULTRON — consultar registros da equipe"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#E10600] text-white shadow-lg">
        <Bot className="h-6 w-6" aria-hidden="true" />
      </Button>
    </DialogTrigger>
    <DialogContent className="ava-shell bg-[#111217] text-white border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>ULTRON — consulta da equipe</DialogTitle>
        <DialogDescription>Encontre registros e fontes dentro das suas permissões. Consulta sem alterações nos dados.</DialogDescription>
      </DialogHeader>
      <UltronReadOnlySearch key={`${user.id}:${user.role}:${user.member_role}:${user.portal_internal}`} user={{ ...user,
        preferred_name:registration?.actor === user.id ? registration.preferred_name
          : profileUser?.id === user.id ? profileUser.preferred_name : undefined }} />
    </DialogContent>
  </Dialog>;
}
