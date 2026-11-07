import { useEffect, useRef, useState } from 'react';

export default function ProjectImport({ defaults, onImport }) {
  const input = useRef(null);
  const request = useRef(0);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => () => { request.current++; }, []);

  const importFiles = async files => {
    if (busy.current || !files?.length) return;
    if (files.length !== 1) { setFeedback({ error: true, text: '请一次选择一个源码 ZIP。' }); return; }
    const file = files[0];
    const id = ++request.current;
    busy.current = true; setLoading(true); setFeedback(null);
    try {
      const { importProject } = await import('../lib/importProject');
      const preset = await importProject(file, defaults);
      if (id !== request.current) return;
      onImport(preset);
      setFeedback({ error: false, text: `已导入 ${file.name}，已恢复包内保存的效果。${preset.paused ? '原效果为暂停状态，可点击「继续播放」。' : ''}` });
    } catch (error) {
      if (id === request.current) setFeedback({ error: true, text: error.message || '导入失败，请重试。' });
    } finally {
      busy.current = false;
      if (id === request.current) setLoading(false);
      if (input.current) input.current.value = '';
    }
  };

  return <section className={`project-import ${dragging ? 'is-dragging' : ''}`} aria-label="导入源码 ZIP" aria-busy={loading}
    onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = loading ? 'none' : 'copy'; if (!loading) setDragging(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); }}>
    <div className="project-import-main">
      <div className="project-import-copy"><span className="project-import-icon" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg></span><div><h2>导入源码 ZIP</h2><p>{dragging ? '松开鼠标，预览包内效果' : '上传或拖入之前下载的代码包，直接预览效果。'}</p></div></div>
      <button type="button" onClick={() => input.current?.click()} disabled={loading}>{loading ? '正在导入…' : '上传 ZIP'}</button>
      <input ref={input} type="file" accept=".zip,application/zip,application/x-zip-compressed" aria-label="选择源码 ZIP" hidden disabled={loading} onChange={event => importFiles(event.target.files)}/>
    </div>
    <p className="project-import-note">文件仅在本地读取 · 使用包内参数在当前版本中还原效果 · 最大 20 MB</p>
    {feedback && <p className={`project-import-feedback ${feedback.error ? 'is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
  </section>;
}
