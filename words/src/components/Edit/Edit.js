import React, { useEffect, useState } from 'react';
import './Edit.css';
import { useParams, useNavigate, Link } from 'react-router-dom';

const emptyWord = () => ({ title: '', transcription: '', translate: '', examples: [] });

const Edit = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [editing, setEditing] = useState(null); // word object or null
  const [isCreating, setIsCreating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    fetch('http://localhost:5000/api/words')
      .then(r => r.json())
      .then(d => setWords(d))
      .catch(err => console.error(err));
  }

  useEffect(() => { load(); }, []);

  // if route has id, open editor for that id when words are loaded
  useEffect(() => {
    if (params.id && words.length > 0) {
      if (params.id === 'new') {
        setEditing({ ...emptyWord(), examples: [{ text: '', isNew: true, isEditing: true }] });
        setIsCreating(true);
        setDirty(true);
        setSaved(false);
      } else {
        const id = Number(params.id);
        const found = words.find(w => w.id === id);
        if (found) {
          const copy = { ...found, examples: (found.examples || []).map(e => ({ text: typeof e === 'string' ? e : e.en || '', isNew: false, isEditing: false })) };
          setEditing(copy);
          setIsCreating(false);
          setDirty(false);
          setSaved(false);
        } else {
          navigate('/edit');
        }
      }
    }
  }, [params.id, words]);

  const startCreate = () => {
    navigate('/edit/new');
  }

  const startEdit = (w) => {
    // clone and prepare examples as { text, isNew:false }
    const copy = { ...w, examples: (w.examples || []).map(e => ({ text: typeof e === 'string' ? e : e.en || '', isNew: false, isEditing: false })) };
    setEditing(copy);
    setIsCreating(false);
    setDirty(false);
    setSaved(false);
  }

  const save = async () => {
    if (!editing || !editing.title.trim() || !editing.translate.trim()) return;
    const payload = { ...editing, examples: editing.examples.map(e => (e.text || '')) };
    try {
      if (isCreating) {
        const res = await fetch('http://localhost:5000/api/words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const created = await res.json();
        // refresh list from server to keep consistent
        await load();
        setSaved(true);
        setDirty(false);
        setEditing(null);
        setIsCreating(false);
        navigate('/edit');
      } else {
        const res = await fetch(`http://localhost:5000/api/words/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const updated = await res.json();
        await load();
        setSaved(true);
        setDirty(false);
        setEditing(null);
        setIsCreating(false);
        navigate('/edit');
      }
    } catch (err) {
      console.error('Save failed', err);
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this word?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/words/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) setWords(prev => prev.filter(w => w.id !== id));
    } catch (err) { console.error(err); }
  }

  const addExampleField = () => {
    if (!editing) return;
    // only allow adding if no example has isNew or isEditing true
    const hasBlocked = editing.examples.some(e => e.isNew || e.isEditing);
    if (hasBlocked) return;
    setEditing(prev => ({ ...prev, examples: [ ...prev.examples, { text: '', isNew: true, isEditing: true } ] }));
    setDirty(true);
  }

  const saveExample = (idx) => {
    setEditing(prev => {
      const ex = prev.examples.map((e,i) => i===idx?{ text: e.text, isNew: false, isEditing: false }:e);
      return { ...prev, examples: ex };
    })
    setDirty(true);
  }

  const removeExample = (idx) => {
    setEditing(prev => {
      const ex = prev.examples.filter((_,i) => i!==idx);
      return { ...prev, examples: ex };
    })
    setDirty(true);
  }

  return (
    <div className='edit-page'>
      <div className='edit-top'>
        <h2>Edit words</h2>
        <div>
          <Link to="/" className='small-btn'>Back to game</Link>
        </div>
      </div>

      {!editing && (
        <>
          <div className='controls'>
            <button className='btn' onClick={startCreate}>Add new word</button>
            <button className='small-btn' onClick={load}>Reload</button>
          </div>

          <div className='word-list'>
            {words.map(w => (
              <div key={w.id} className='word-row'>
                <div>{w.title} — {w.translate}</div>
                <div>
                  <Link to={`/edit/${w.id}`} className='small-btn'>Edit</Link>
                  <button className='small-btn' onClick={() => remove(w.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className='editor'>
          <div>
            <label>Word / expression</label>
            <input value={editing.title} onChange={e => { setEditing(prev => ({ ...prev, title: e.target.value })); setDirty(true); setSaved(false); }} />
          </div>
          <div>
            <label>Transcription</label>
            <input value={editing.transcription} onChange={e => { setEditing(prev => ({ ...prev, transcription: e.target.value })); setDirty(true); setSaved(false); }} />
          </div>
          <div>
            <label>Translate</label>
            <input value={editing.translate} onChange={e => { setEditing(prev => ({ ...prev, translate: e.target.value })); setDirty(true); setSaved(false); }} />
          </div>

          <div className='examples-list'>
            <label>Examples</label>
            {editing.examples.map((ex, idx) => (
              <div className='example-row' key={idx}>
                {ex.isNew || ex.isEditing ? (
                  <>
                    <input value={ex.text} onChange={e => { setEditing(prev => ({ ...prev, examples: prev.examples.map((ee,i)=> i===idx?{...ee, text: e.target.value}:ee) })); setDirty(true); setSaved(false); }} />
                    <button className='small-btn' onClick={() => saveExample(idx)} disabled={!(ex.isNew || ex.isEditing)}>Save</button>
                    <button className='small-btn' onClick={() => removeExample(idx)}>Remove</button>
                  </>
                ) : (
                  <>
                    <div style={{flex:1, padding:'6px 8px', background:'#f7f7f7'}}>{ex.text}</div>
                    <button className='small-btn' onClick={() => setEditing(prev => ({ ...prev, examples: prev.examples.map((ee,i)=> i===idx?{...ee, isEditing:true}:ee) }))}>Edit</button>
                    <button className='small-btn' onClick={() => removeExample(idx)}>Remove</button>
                  </>
                )}
              </div>
            ))}
            <div style={{marginTop:8}}>
              <button className='small-btn' onClick={addExampleField} disabled={editing.examples.some(e => e.isNew || e.isEditing)}>+ Add example</button>
            </div>
          </div>

          <div className='controls'>
            <button className='btn' onClick={save} disabled={!dirty || !editing?.title?.trim() || !editing?.translate?.trim()}>{dirty ? 'Save*' : (saved ? 'Saved' : 'Save')}</button>
            <button className='small-btn' onClick={() => navigate('/edit')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Edit;
