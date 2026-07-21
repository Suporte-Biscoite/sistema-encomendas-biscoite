'use client';

import { useState, useEffect } from 'react';

// Interfaces
interface Funcionario {
  id: string;
  nome: string;
  setor: string;
  email: string;
  whatsapp?: string;
}

interface Encomenda {
  id: string;
  created_at: string;
  quem_recebeu: string;
  status: string;
  numero_nota?: string;
  foto_preview?: string;
  quem_retirou?: string;
  funcionarios: { nome: string; whatsapp?: string; setor?: string } | null;
}

interface UsuarioSistema {
  id: string;
  nome: string;
  usuario: string;
  senha?: string;
}

export default function Home() {
  const [telaPrincipal, setTelaPrincipal] = useState<'publico' | 'login' | 'admin'>('publico');
  const [subAbaAdmin, setSubAbaAdmin] = useState<'encomendas' | 'funcionarios' | 'usuarios'>('encomendas');
  const [loading, setLoading] = useState(true);

  // Estados dos Dados
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioSistema[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioSistema | null>(null);

  // Filtros de Busca e Status
  const [buscaEncomenda, setBuscaEncomenda] = useState('');
  const [buscaFuncionario, setBuscaFuncionario] = useState('');
  const [buscaPublica, setBuscaPublica] = useState('');
  const [filtroStatusAdmin, setFiltroStatusAdmin] = useState<'todos' | 'recebido' | 'retirado'>('todos');

  // Estados dos Formulários de Funcionários
  const [nomeFunc, setNomeFunc] = useState('');
  const [setorFunc, setSetorFunc] = useState('');
  const [emailFunc, setEmailFunc] = useState('');
  const [whatsFunc, setWhatsFunc] = useState('');
  const [idEditandoFunc, setIdEditandoFunc] = useState<string | null>(null);

  // Estados do Formulário de Encomendas
  const [destinatarioId, setDestinatarioId] = useState('');
  const [recepcionista, setRecepcionista] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string>('');
  // Arquivo real selecionado, usado para o upload (não afeta a UI existente)
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);

  // Estados de Usuários do Sistema
  const [novoOpNome, setNovoOpNome] = useState('');
  const [novoOpUser, setNovoOpUser] = useState('');
  const [novoOpSenha, setNovoOpSenha] = useState('');

  // Estados de Login
  const [inputUser, setInputUser] = useState('');
  const [inputSenha, setInputSenha] = useState('');

  // Modais de Visualização e Confirmação
  const [modalFoto, setModalFoto] = useState<string | null>(null);
  const [encomendaParaBaixar, setEncomendaParaBaixar] = useState<Encomenda | null>(null);
  const [nomeRetiranteModal, setNomeRetiranteModal] = useState('');

  const carregarFuncionarios = async () => {
    const resp = await fetch('/api/funcionarios');
    if (resp.ok) setFuncionarios(await resp.json());
  };

  const carregarEncomendas = async () => {
    const resp = await fetch('/api/encomendas');
    if (resp.ok) setEncomendas(await resp.json());
  };

  const carregarUsuariosSistema = async () => {
    const resp = await fetch('/api/usuarios');
    if (resp.ok) setUsuariosSistema(await resp.json());
  };

  const carregarDados = async () => {
    setLoading(true);
    await Promise.all([carregarFuncionarios(), carregarEncomendas()]);
    setLoading(false);
  };

  useEffect(() => {
    const iniciar = async () => {
      // Verifica se já existe uma sessão de operador ativa (cookie httpOnly)
      const respSessao = await fetch('/api/auth/me');
      if (respSessao.ok) {
        const { usuario } = await respSessao.json();
        if (usuario) {
          setUsuarioLogado(usuario);
          setTelaPrincipal('admin');
          await carregarUsuariosSistema();
        }
      }
      await carregarDados();
    };
    iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImportarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = async (evento) => {
      const texto = evento.target?.result as string;
      const lines = texto.split('\n');
      const novosFuncionarios: { nome: string; setor: string; email: string; whatsapp?: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const separador = line.includes(';') ? ';' : ',';
        const colunas = line.split(separador);

        if (colunas.length >= 3) {
          novosFuncionarios.push({
            nome: colunas[0]?.trim(),
            setor: colunas[1]?.trim(),
            email: colunas[2]?.trim(),
            whatsapp: colunas[3]?.trim() || '',
          });
        }
      }

      if (novosFuncionarios.length > 0) {
        const resp = await fetch('/api/funcionarios/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itens: novosFuncionarios }),
        });

        if (resp.ok) {
          const resultado = await resp.json();
          await carregarFuncionarios();
          alert(`${resultado.importados} colaboradores importados com sucesso!`);
        } else {
          const erro = await resp.json();
          alert(erro.error || 'Erro ao importar colaboradores.');
        }
      }
    };
    leitor.readAsText(arquivo, 'UTF-8');
    e.target.value = '';
  };

  const exportarRelatorioCSV = () => {
    if (encomendas.length === 0) return alert('Nenhum registro para exportar.');

    let csvConteudo = 'Nome Colaborador;Nota Fiscal;Recebido Por;Data Entrada;Status;Quem Retirou\n';

    encomendas.forEach(e => {
      const nome = e.funcionarios?.nome || 'Excluído';
      const nf = e.numero_nota || 'Sem NF';
      const operador = e.quem_recebeu;
      const data = new Date(e.created_at).toLocaleString('pt-BR');
      const status = e.status === 'recebido' ? 'Aguardando' : 'Retirado';
      const retirou = e.quem_retirou || '—';

      csvConteudo += `${nome};${nf};${operador};${data};${status};${retirou}\n`;
    });

    const blob = new Blob([csvConteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_encomendas_biscoite_${new Date().toLocaleDateString('pt-BR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: inputUser, senha: inputSenha }),
    });

    if (resp.ok) {
      const conta = await resp.json();
      setUsuarioLogado(conta);
      setTelaPrincipal('admin');
      setInputUser(''); setInputSenha('');
      await carregarUsuariosSistema();
    } else {
      alert('Usuário ou senha incorretos!');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUsuarioLogado(null);
    setUsuariosSistema([]);
    setTelaPrincipal('publico');
  };

  const cadastrarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoOpNome || !novoOpUser || !novoOpSenha) return alert('Preencha todos os campos!');

    const resp = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoOpNome, usuario: novoOpUser, senha: novoOpSenha }),
    });

    if (resp.ok) {
      await carregarUsuariosSistema();
      setNovoOpNome(''); setNovoOpUser(''); setNovoOpSenha('');
    } else {
      const erro = await resp.json();
      alert(erro.error || 'Erro ao criar operador.');
    }
  };

  const deletarOperador = async (id: string) => {
    if (usuariosSistema.length <= 1) return alert('O sistema precisa ter pelo menos 1 operador!');
    if (confirm('Deseja remover o acesso deste usuário?')) {
      const resp = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        await carregarUsuariosSistema();
      } else {
        const erro = await resp.json();
        alert(erro.error || 'Erro ao remover operador.');
      }
    }
  };

  const salvarFuncionarioForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFunc || !setorFunc || !emailFunc) return alert('Preencha os campos obrigatórios!');

    const payload = { nome: nomeFunc, setor: setorFunc, email: emailFunc, whatsapp: whatsFunc };

    const resp = idEditandoFunc
      ? await fetch(`/api/funcionarios/${idEditandoFunc}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/funcionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (resp.ok) {
      await carregarFuncionarios();
      if (idEditandoFunc) {
        setIdEditandoFunc(null);
        alert('Cadastro atualizado!');
      }
    } else {
      const erro = await resp.json();
      alert(erro.error || 'Erro ao salvar colaborador.');
    }

    setNomeFunc(''); setSetorFunc(''); setEmailFunc(''); setWhatsFunc('');
  };

  const deletarFuncionario = async (id: string) => {
    if (confirm('Deseja remover este colaborador do sistema?')) {
      const resp = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        await carregarFuncionarios();
      } else {
        const erro = await resp.json();
        alert(erro.error || 'Erro ao remover colaborador.');
      }
    }
  };

  const registrarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinatarioId || !recepcionista) return alert('Preencha os campos obrigatórios!');

    let fotoUrl: string | undefined;
    if (arquivoFoto) {
      const formData = new FormData();
      formData.append('arquivo', arquivoFoto);
      const respUpload = await fetch('/api/upload', { method: 'POST', body: formData });
      if (respUpload.ok) {
        fotoUrl = (await respUpload.json()).url;
      } else {
        const erro = await respUpload.json();
        return alert(erro.error || 'Erro ao enviar a foto.');
      }
    }

    const resp = await fetch('/api/encomendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinatario_id: destinatarioId,
        quem_recebeu: recepcionista,
        numero_nota: numeroNota,
        foto_url: fotoUrl,
      }),
    });

    if (resp.ok) {
      await carregarEncomendas();
      setRecepcionista(''); setDestinatarioId(''); setNumeroNota(''); setFotoPreview(''); setArquivoFoto(null);
    } else {
      const erro = await resp.json();
      alert(erro.error || 'Erro ao registrar encomenda.');
    }
  };

  const confirmarBaixaModal = async () => {
    if (!encomendaParaBaixar) return;

    const resp = await fetch(`/api/encomendas/${encomendaParaBaixar.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quem_retirou: nomeRetiranteModal.trim() }),
    });

    if (resp.ok) {
      await carregarEncomendas();
    } else {
      const erro = await resp.json();
      alert(erro.error || 'Erro ao confirmar retirada.');
    }

    setEncomendaParaBaixar(null);
    setNomeRetiranteModal('');
  };

  const abrirMensagemWhatsApp = (enc: Encomenda) => {
    const telefone = enc.funcionarios?.whatsapp?.replace(/\D/g, '');
    if (!telefone) return alert('Este colaborador não possui WhatsApp.');
    const textoMsg = `Olá *${enc.funcionarios?.nome}*! 👋%0A%0AUma encomenda sua (Nota Fiscal: *${enc.numero_nota ? `#${enc.numero_nota}` : 'Sem número'}*) acabou de ser recebida na logística da *Biscoitê* por *${enc.quem_recebeu}* e já está disponível para retirada. 📦✨`;
    window.open(`https://wa.me/55${telefone}?text=${textoMsg}`, '_blank');
  };

  // Filtros
  const encomendasPendentesLogistica = encomendas.filter(e => e.status.toLowerCase() === 'recebido');

  const encomendasFiltradas = encomendas.filter(enc => {
    const bateBusca = enc.funcionarios?.nome.toLowerCase().includes(buscaEncomenda.toLowerCase());
    const bateStatus = filtroStatusAdmin === 'todos' ? true : enc.status.toLowerCase() === filtroStatusAdmin;
    return bateBusca && bateStatus;
  });

  const funcionariosFiltrados = funcionarios.filter(f => f.nome.toLowerCase().includes(buscaFuncionario.toLowerCase()));
  const encomendasPublicasFiltradas = encomendasPendentesLogistica.filter(enc => enc.funcionarios?.nome.toLowerCase().includes(buscaPublica.toLowerCase()));
  const funcionarioSelecionado = funcionarios.find(f => f.id === destinatarioId);

  return (
    <div className="min-h-screen bg-biscoite-bg text-[#0F172A] font-sans antialiased">
      
      {/* 1. VIEW PÚBLICA (MURAL DE ENCOMENDAS ATUALIZADO) */}
      {telaPrincipal === 'publico' && (
        <>
          <header className="bg-biscoite-dark text-white p-4 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo-biscoite.svg" alt="Biscoitê" className="h-9 w-auto object-contain" />
              <div className="border-l border-white/20 pl-3">
                <h1 className="text-sm font-bold tracking-tight">Biscoitê</h1>
                <p className="text-[10px] text-gray-400 font-medium">Mural de Encomendas</p>
              </div>
            </div>
            <button onClick={() => setTelaPrincipal('login')} className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-white/10 transition">🔒 Acesso Logística</button>
          </header>

          <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="text-center py-4 space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-biscoite-dark">Tem alguma encomenda esperando por você?</h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">Digite seu nome abaixo para verificar os volumes retidos na logística.</p>
            </div>

            <div className="relative max-w-md mx-auto shadow-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <input type="text" placeholder="Digite seu nome para buscar..." className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-biscoite-brand/20 focus:border-biscoite-brand transition" value={buscaPublica} onChange={e => setBuscaPublica(e.target.value)} />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Aguardando Retirada ({encomendasPendentesLogistica.length})</h3>
              
              <div className="space-y-3">
                {encomendasPublicasFiltradas.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8 font-medium">Nenhuma encomenda pendente encontrada.</p>
                ) : (
                  encomendasPublicasFiltradas.map(enc => (
                    // Alterado de grid para um flex flex-col sm:flex-row para alinhamento horizontal impecável
                    <div key={enc.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-biscoite-brand/20 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">📦</div>
                        <div>
                          <h4 className="font-bold text-biscoite-dark text-sm">{enc.funcionarios?.nome}</h4>
                          <p className="text-[11px] text-gray-400">Recebido às {new Date(enc.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>

                      {/* 🌟 REQUISITO: Bloco com as informações do destinatário e da NF ao lado do botão de ver caixa */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                        <div className="text-left sm:text-right space-y-0.5">
                          {enc.funcionarios?.setor && (
                            <span className="inline-block text-[10px] bg-biscoite-brand/10 text-biscoite-primary font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              Setor: {enc.funcionarios.setor}
                            </span>
                          )}
                          {enc.numero_nota && (
                            <p className="text-[10px] font-mono text-gray-400 font-medium">NF #{enc.numero_nota}</p>
                          )}
                        </div>
                        
                        {enc.foto_preview && (
                          <button 
                            onClick={() => setModalFoto(enc.foto_preview || null)} 
                            className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-biscoite-brand transition shadow-sm shrink-0"
                          >
                            Ver Caixa
                          </button>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {/* 2. TELA DE LOGIN */}
      {telaPrincipal === 'login' && (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-biscoite-dark text-white">
          <div className="w-full max-w-sm space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <img src="/logo-biscoite.svg" alt="Biscoitê" className="h-10 mx-auto object-contain brightness-0 invert" />
              <h2 className="text-base font-bold tracking-tight">Painel Operacional Logística</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-gray-400 mb-1">USUÁRIO</label>
                <input type="text" placeholder="Seu usuário" className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm outline-none focus:border-biscoite-brand text-white" value={inputUser} onChange={e => setInputUser(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-gray-400 mb-1">SENHA</label>
                <input type="password" placeholder="••••••••" className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm outline-none focus:border-biscoite-brand text-white" value={inputSenha} onChange={e => setInputSenha(e.target.value)} />
              </div>
              <button type="submit" className="w-full bg-biscoite-primary hover:bg-biscoite-brand text-white p-3 rounded-xl font-bold text-sm transition shadow-md">Entrar no Sistema</button>
            </form>
            <button onClick={() => setTelaPrincipal('publico')} className="w-full text-center text-xs text-gray-400 hover:text-white transition pt-2">← Voltar</button>
          </div>
        </div>
      )}

      {/* 3. PAINEL ADMINISTRATIVO RESTRITO */}
      {telaPrincipal === 'admin' && (
        <>
          <header className="bg-biscoite-dark text-white p-4 shadow-sm sticky top-0 z-40 border-b border-white/5">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex justify-between items-center w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <img src="/logo-biscoite.svg" alt="Biscoitê" className="h-9 w-auto object-contain" />
                  <div className="border-l border-white/20 pl-3">
                    <h1 className="text-sm font-bold tracking-tight">Biscoitê</h1>
                    <p className="text-[10px] text-gray-300">Sistema de Encomendas</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="md:hidden text-xs text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg">Sair</button>
              </div>
              
              <div className="flex w-full md:w-auto gap-1 bg-black/20 p-1 rounded-lg border border-white/5 overflow-x-auto">
                <button onClick={() => setSubAbaAdmin('encomendas')} className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${subAbaAdmin === 'encomendas' ? 'bg-biscoite-primary text-white' : 'text-gray-400 hover:text-white'}`}>Encomendas</button>
                <button onClick={() => setSubAbaAdmin('funcionarios')} className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${subAbaAdmin === 'funcionarios' ? 'bg-biscoite-primary text-white' : 'text-gray-400 hover:text-white'}`}>Funcionários</button>
                <button onClick={() => setSubAbaAdmin('usuarios')} className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${subAbaAdmin === 'usuarios' ? 'bg-biscoite-primary text-white' : 'text-gray-400 hover:text-white'}`}>Acessos Sistema</button>
                <button onClick={handleLogout} className="hidden md:block px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 rounded-md">Sair →</button>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            
            {/* SUB-ABA: ENCOMENDAS */}
            {subAbaAdmin === 'encomendas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
                  <h2 className="text-sm sm:text-base text-biscoite-dark font-bold mb-4">Nova Entrada</h2>
                  <form onSubmit={registrarEncomenda} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Destinatário *</label>
                      <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none h-11" value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)}>
                        <option value="">Selecione quem vai receber...</option>
                        {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — [{f.setor}]</option>)}
                      </select>
                      {funcionarioSelecionado && (
                        <div className="mt-2 p-2.5 bg-blue-50/50 border border-biscoite-brand/20 rounded-lg text-xs space-y-1">
                          <p className="text-gray-600">📧 <span className="font-semibold text-biscoite-dark">E-mail:</span> {funcionarioSelecionado.email}</p>
                          {funcionarioSelecionado.whatsapp && <p className="text-gray-600">📱 <span className="font-semibold text-biscoite-dark">WhatsApp:</span> {funcionarioSelecionado.whatsapp}</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Operador Portaria *</label>
                      <input type="text" placeholder="Seu nome" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none h-11" value={recepcionista} onChange={(e) => setRecepcionista(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Nº Nota Fiscal</label>
                      <input type="text" placeholder="Ex: 15420" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none h-11" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Foto da Caixa / Etiqueta</label>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-3 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer min-h-[70px]">
                        {fotoPreview ? <span className="text-xs text-emerald-600 font-semibold">Foto capturada! 👍</span> : <span className="text-xs text-gray-500 font-medium">📸 Abrir Câmera / Anexar</span>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} />
                      </label>
                    </div>
                    <button type="submit" className="w-full bg-biscoite-primary text-white p-3 rounded-lg font-semibold text-sm transition h-11">Registrar Entrada</button>
                  </form>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-sm sm:text-base text-biscoite-dark font-bold">Movimentação Operacional</h2>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
                        <button onClick={() => setFiltroStatusAdmin('todos')} className={`px-2.5 py-1 rounded-md font-medium transition ${filtroStatusAdmin === 'todos' ? 'bg-white shadow-sm text-biscoite-dark' : 'text-gray-400'}`}>Todos</button>
                        <button onClick={() => setFiltroStatusAdmin('recebido')} className={`px-2.5 py-1 rounded-md font-medium transition ${filtroStatusAdmin === 'recebido' ? 'bg-white shadow-sm text-biscoite-dark' : 'text-gray-400'}`}>Aguardando</button>
                        <button onClick={() => setFiltroStatusAdmin('retirado')} className={`px-2.5 py-1 rounded-md font-medium transition ${filtroStatusAdmin === 'retirado' ? 'bg-white shadow-sm text-biscoite-dark' : 'text-gray-400'}`}>Retirados</button>
                      </div>
                      <button 
                        onClick={exportarRelatorioCSV}
                        className="bg-white border border-gray-200 hover:border-emerald-500 text-gray-600 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                      >
                        📊 Exportar
                      </button>
                    </div>
                  </div>

                  <div className="w-full">
                    <input type="text" placeholder="Buscar por colaborador..." className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none w-full h-9 mb-2" value={buscaEncomenda} onChange={e => setBuscaEncomenda(e.target.value)} />
                  </div>

                  <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 text-xs uppercase tracking-wider">
                          <th className="p-3.5">Funcionário</th>
                          <th className="p-3.5">NF</th>
                          <th className="p-3.5">Operador</th>
                          <th className="p-3.5">Status / Recebedor</th>
                          <th className="p-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {encomendasFiltradas.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-xs font-medium">Nenhuma encomenda nesta listagem.</td></tr>
                        ) : (
                          encomendasFiltradas.map(enc => (
                            <tr key={enc.id} className="hover:bg-biscoite-bg/30 transition">
                              <td className="p-3.5 font-semibold text-biscoite-dark">{enc.funcionarios?.nome}</td>
                              <td className="p-3.5 text-gray-600 text-xs font-mono">{enc.numero_nota ? `#${enc.numero_nota}` : '—'}</td>
                              <td className="p-3.5 text-gray-600 font-medium">{enc.quem_recebeu}</td>
                              <td className="p-3.5">
                                {enc.status === 'recebido' ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">Aguardando</span>
                                ) : (
                                  <div className="text-xs">
                                    <span className="px-2.5 py-0.5 rounded-full font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">Retirado</span>
                                    <p className="text-[10px] text-gray-400 mt-1">Por: {enc.quem_retirou}</p>
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {enc.foto_preview && <button onClick={() => setModalFoto(enc.foto_preview || null)} className="border border-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-50 transition">Ver Nota</button>}
                                  
                                  {enc.status === 'recebido' && enc.funcionarios?.whatsapp && (
                                    <button onClick={() => abrirMensagemWhatsApp(enc)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 rounded text-xs font-semibold transition">
                                      Avisar Whats
                                    </button>
                                  )}

                                  {enc.status === 'recebido' ? (
                                    <button 
                                      onClick={() => setEncomendaParaBaixar(enc)}
                                      className="bg-biscoite-primary text-white px-3 py-1 rounded text-xs font-semibold hover:bg-biscoite-brand transition shadow-sm"
                                    >
                                      Dar Baixa
                                    </button>
                                  ) : <span className="text-xs text-gray-400 pr-2">✓ Entregue</span>}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA: GERENCIAR FUNCIONÁRIOS */}
            {subAbaAdmin === 'funcionarios' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-biscoite-dark mb-4">
                      {idEditandoFunc ? '📝 Editando Colaborador' : 'Novo Colaborador Individual'}
                    </h2>
                    <form onSubmit={salvarFuncionarioForm} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Nome Completo *</label>
                        <input type="text" placeholder="Nome" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={nomeFunc} onChange={e => setNomeFunc(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Setor *</label>
                        <input type="text" placeholder="Ex: Financeiro" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={setorFunc} onChange={e => setSetorFunc(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">E-mail Corporativo *</label>
                        <input type="email" placeholder="email@biscoite.com.br" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={emailFunc} onChange={e => setEmailFunc(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">WhatsApp</label>
                        <input type="text" placeholder="DDD + Número" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={whatsFunc} onChange={e => setWhatsFunc(e.target.value)} />
                      </div>
                      
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-biscoite-primary hover:bg-biscoite-brand text-white p-3 rounded-lg font-semibold text-sm transition">
                          {idEditandoFunc ? 'Salvar Alterações' : 'Salvar Colaborador'}
                        </button>
                        {idEditandoFunc && (
                          <button type="button" onClick={() => { setIdEditandoFunc(null); setNomeFunc(''); setSetorFunc(''); setEmailFunc(''); setWhatsFunc(''); }} className="bg-gray-100 text-gray-600 px-4 rounded-lg text-sm font-medium">Cancelar</button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-bold text-biscoite-dark mb-2">Importar Lista por Planilha</h3>
                    <label className="block w-full bg-gray-50 border border-gray-200 hover:border-biscoite-brand p-3 rounded-lg text-center cursor-pointer text-xs font-semibold text-gray-600 transition">
                      📁 Escolher Arquivo Planilha (.csv)
                      <input type="file" accept=".csv" className="hidden" onChange={handleImportarCSV} />
                    </label>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-biscoite-dark">Equipe Corporativa</h2>
                    <input type="text" placeholder="Filtrar por nome..." className="pl-3 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none w-48" value={buscaFuncionario} onChange={e => setBuscaFuncionario(e.target.value)} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {funcionariosFiltrados.map(f => (
                      <div key={f.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-biscoite-dark">{f.nome}</h4>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{f.setor}</p>
                          <p className="text-xs text-gray-400 mt-2">📧 {f.email}</p>
                          {f.whatsapp && <p className="text-[11px] text-emerald-700 font-semibold mt-1">📱 {f.whatsapp}</p>}
                        </div>
                        
                        <div className="flex gap-1 text-gray-300">
                          <button onClick={() => { setIdEditandoFunc(f.id); setNomeFunc(f.nome); setSetorFunc(f.setor); setEmailFunc(f.email); setWhatsFunc(f.whatsapp || ''); }} className="hover:text-biscoite-primary p-1 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => deletarFuncionario(f.id)} className="hover:text-red-500 p-1 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA: ACESSOS SISTEMA */}
            {subAbaAdmin === 'usuarios' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
                  <h2 className="text-sm font-bold text-biscoite-dark mb-4">Criar Usuário Operador</h2>
                  <form onSubmit={cadastrarOperador} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">Nome do Operador</label>
                      <input type="text" placeholder="Ex: Recepção Loja Jardins" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={novoOpNome} onChange={e => setNovoOpNome(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">Nome de Usuário (Login)</label>
                      <input type="text" placeholder="Ex: portaria.jardins" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={novoOpUser} onChange={e => setNovoOpUser(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">Senha Inicial</label>
                      <input type="password" placeholder="Defina uma senha" className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none" value={novoOpSenha} onChange={e => setNovoOpSenha(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full bg-biscoite-primary text-white p-3 rounded-lg font-semibold text-sm">Criar Operador</button>
                  </form>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 md:col-span-2 space-y-4">
                  <h2 className="text-sm font-bold text-biscoite-dark">Operadores com Acesso Ativo</h2>
                  <div className="space-y-2">
                    {usuariosSistema.map(user => (
                      <div key={user.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-biscoite-dark">{user.nome}</h4>
                          <p className="text-xs text-gray-400">Login: <span className="font-mono bg-gray-200/60 px-1 rounded text-[#0F172A]">{user.usuario}</span></p>
                        </div>
                        <button onClick={() => deletarOperador(user.id)} className="text-gray-300 hover:text-red-500 p-1.5 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE BAIXA */}
      {encomendaParaBaixar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="text-center space-y-2 mb-4">
              <span className="text-3xl inline-block bg-blue-50 p-2.5 rounded-full text-biscoite-primary">🤝</span>
              <h3 className="font-bold text-biscoite-dark text-base">Confirmar Entrega de Caixa</h3>
              <p className="text-xs text-gray-400">Você está dando baixa no pacote de <strong className="text-[#0F172A]">{encomendaParaBaixar.funcionarios?.nome}</strong> (NF: {encomendaParaBaixar.numero_nota ? `#${encomendaParaBaixar.numero_nota}` : 'Sem nota'}).</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Quem está retirando?</label>
                <input 
                  type="text" 
                  placeholder="Nome do retirante (Opcional)" 
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-biscoite-brand transition bg-gray-50"
                  value={nomeRetiranteModal}
                  onChange={e => setNomeRetiranteModal(e.target.value)}
                />
                <span className="text-[9px] text-gray-400 block mt-1 leading-normal">Se o campo ficar vazio, assumiremos que o próprio dono buscou.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={confirmarBaixaModal}
                  className="flex-1 bg-biscoite-primary hover:bg-biscoite-brand text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Confirmar Retirada
                </button>
                <button 
                  onClick={() => { setEncomendaParaBaixar(null); setNomeRetiranteModal(''); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FOTO */}
      {modalFoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setModalFoto(null)}>
          <div className="bg-white p-4 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-biscoite-dark text-sm">📄 Visualizar Documento Anexo</h3>
              <button onClick={() => setModalFoto(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="overflow-auto flex-1 bg-gray-50 rounded-xl p-2 flex justify-center items-center">
              <img src={modalFoto} alt="Nota Fiscal Ampliada" className="max-w-full h-auto max-h-[60vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}