import React from 'react';
export default class PortalErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 // Do not log component data, payloads, provider errors or personal records.
 render(){
  if(!this.state.failed)return this.props.children;
  return <main className="min-h-screen bg-[#0B0B0D] text-white flex items-center justify-center p-5" role="alert"><section className="max-w-lg rounded-2xl border border-red-600/40 bg-[#111217] p-6 space-y-4">
   <h1 className="text-xl font-bold">Esta tela encontrou um erro</h1><p className="text-gray-300">O Portal não conseguiu exibir esta página. Antes de reenviar um formulário, confira se o registro já foi salvo.</p>
   <p className="text-sm text-gray-400">O site é em português. Extensões de tradução automática podem interferir nos formulários.</p>
   <button className="rounded-lg bg-[#E10600] px-4 py-3 font-medium" onClick={()=>window.location.reload()}>Recarregar página</button>
   <a className="block text-red-300 underline" href="/AreaInterna">Voltar à Área Interna</a>
  </section></main>;
 }
}
