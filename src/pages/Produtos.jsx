import { useRef, useState } from 'react';
import { brl, uid, useStore } from '../store.jsx';
import { CATEGORIAS } from '../seed.js';
import { Modal } from '../ui.jsx';
import { FotoProduto } from '../fotos.jsx';

// Cadastro de produtos do cardápio, com foto.
// A foto enviada é reduzida para 480px (JPEG) antes de ser salva, para o sistema continuar leve.

function reduzirFoto(arquivo, lado = 480) {
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onerror = erro;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = erro;
      img.onload = () => {
        const menor = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = lado; canvas.height = lado;
        // recorte quadrado central
        canvas.getContext('2d').drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor, 0, 0, lado, lado);
        ok(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

const COZINHA = ['Lanches', 'Porções', 'Pratos'];

export default function Produtos() {
  const { s, act } = useStore();
  const [cat, setCat] = useState('Todos');
  const [ed, setEd] = useState(null);
  const [erro, setErro] = useState('');
  const arquivo = useRef(null);
  const lista = s.produtos.filter((p) => cat === 'Todos' || p.cat === cat);
  const comFoto = s.produtos.filter((p) => p.foto).length;

  const escolherFoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setErro(''); setEd({ ...ed, foto: await reduzirFoto(f) }); } catch (x) { setErro('Não consegui ler essa imagem. Tente uma foto JPG ou PNG.'); }
  };
  const salvar = () => {
    const p = { ...ed, preco: Number(String(ed.preco).replace(',', '.')) || 0 };
    act((d) => {
      if (p.id) Object.assign(d.produtos.find((x) => x.id === p.id), p);
      else d.produtos.push({ ...p, id: uid('p'), ficha: [], destino: COZINHA.includes(p.cat) ? 'cozinha' : 'bar' });
    });
    setEd(null);
  };

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}>
          <h1>Produtos e cardápio</h1>
          <span className="muted">{s.produtos.length} produtos · {comFoto} com foto real · os demais usam ilustração</span>
        </div>
        <button type="button" className="btn primary" onClick={() => setEd({ nome: '', cat: cat === 'Todos' ? CATEGORIAS[0] : cat, preco: '', descricao: '', ativo: true })}>+ Novo produto</button>
      </div>
      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {['Todos', ...CATEGORIAS].map((c) => <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {lista.map((p) => (
          <button key={p.id} type="button" className="card col" style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text)', opacity: p.ativo ? 1 : 0.5 }} onClick={() => { setErro(''); setEd({ descricao: '', ...p }); }}>
            <div style={{ position: 'relative' }}>
              <FotoProduto produto={p} tamanho="100%" raio={12} style={{ aspectRatio: '1 / 1', height: 'auto' }} />
              <span className="pill" style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{p.foto ? 'Foto real' : 'Ilustração'}</span>
            </div>
            <div className="row between" style={{ gap: 8 }}>
              <b>{p.nome}</b>
              <span className="accent display" style={{ fontWeight: 700 }}>{brl(p.preco)}</span>
            </div>
            <span className="small muted">{p.cat}{p.ativo ? '' : ' · fora do cardápio'}{p.esgotado ? <b className="bad"> · ESGOTADO</b> : ''}</span>
          </button>
        ))}
      </div>
      {ed && (
        <Modal titulo={ed.id ? 'Editar produto' : 'Novo produto'} onClose={() => setEd(null)}>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <FotoProduto produto={ed} tamanho={120} raio={14} />
            <div className="col" style={{ gap: 8 }}>
              <input ref={arquivo} type="file" accept="image/*" style={{ display: 'none' }} onChange={escolherFoto} />
              <button type="button" className="btn sm" onClick={() => arquivo.current?.click()}>{ed.foto ? 'Trocar foto' : 'Enviar foto real'}</button>
              {ed.foto && <button type="button" className="btn sm ghost" onClick={() => setEd({ ...ed, foto: null })}>Voltar para ilustração</button>}
              <span className="small muted">Foto quadrada fica melhor. O sistema recorta e reduz sozinho.</span>
              {erro && <span className="small" style={{ color: 'var(--danger, #E5484D)' }}>{erro}</span>}
            </div>
          </div>
          <label className="field">Nome<input className="input" value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></label>
          <label className="field">Descrição curta (aparece no cardápio do cliente)<input className="input" value={ed.descricao || ''} placeholder="Ex.: pão, hambúrguer, queijo, bacon e ovo" onChange={(e) => setEd({ ...ed, descricao: e.target.value })} /></label>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field">Categoria
              <select className="input" value={ed.cat} onChange={(e) => setEd({ ...ed, cat: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="field">Preço (R$)<input className="input" inputMode="decimal" value={ed.preco} onChange={(e) => setEd({ ...ed, preco: e.target.value })} /></label>
          </div>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Aparece no cardápio</label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!ed.esgotado} onChange={(e) => setEd({ ...ed, esgotado: e.target.checked })} /> Esgotado agora</label>
          <button type="button" className="btn primary big" disabled={!ed.nome.trim()} onClick={salvar}>Salvar</button>
        </Modal>
      )}
    </>
  );
}
