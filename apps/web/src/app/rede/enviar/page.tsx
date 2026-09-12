'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';

const CONSENT =
  'Confirmo que possuo autorização, direito ou base legítima para compartilhar este documento com outros usuários da plataforma.';

export default function EnviarConvencaoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [unions, setUnions] = useState<any[]>([]);
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [unionId, setUnionId] = useState('');
  const [probableType, setProbableType] = useState('CCT');
  const [notes, setNotes] = useState('');
  const [originDescription, setOriginDescription] = useState('');
  const [sharingScope, setSharingScope] = useState<'PRIVATE' | 'NETWORK_RELATED_UNION' | 'NETWORK_GLOBAL'>(
    'NETWORK_RELATED_UNION',
  );
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api<any[]>('/unions').then(setUnions).catch(() => {});
  }, []);

  function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      setFileBase64(raw.includes(',') ? raw.split(',')[1] : raw);
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const row = await api('/collaborative/contributions', {
        method: 'POST',
        body: JSON.stringify({
          fileBase64,
          fileName,
          unionId,
          sharingScope,
          originDescription,
          consentAccepted: sharingScope === 'PRIVATE' ? true : consentAccepted,
          probableType,
          notes,
          title: fileName,
        }),
      });
      setResult(row);
      setStep(6);
      setMsg('Documento recebido. Processando…');
    } catch (err: any) {
      setMsg(err?.message || 'Falha no envio');
    } finally {
      setBusy(false);
    }
  }

  const union = unions.find((u) => u.id === unionId);

  return (
    <Shell title="Enviar convenção">
      <div className="page">
        <PageHeader
          eyebrow={`Etapa ${step} de 6`}
          title="Enviar convenção"
          description="Upload seguro com vínculo sindical, origem declarada e escopo de compartilhamento."
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}

        <form className="panel" onSubmit={(e) => void submit(e)}>
          {step === 1 && (
            <div className="stack">
              <label>
                Arquivo (PDF/HTML/TXT)
                <input
                  type="file"
                  accept=".pdf,.html,.htm,.txt,application/pdf,text/html,text/plain"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                />
              </label>
              <button
                type="button"
                className="primary"
                disabled={!fileBase64}
                onClick={() => setStep(2)}
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <label>
                Sindicato
                <select value={unionId} onChange={(e) => setUnionId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {unions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button type="button" className="primary" disabled={!unionId} onClick={() => setStep(3)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <label>
                Tipo provável
                <select value={probableType} onChange={(e) => setProbableType(e.target.value)}>
                  <option value="CCT">CCT</option>
                  <option value="ACT">ACT</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>
              <label>
                Como obteve o documento
                <textarea
                  value={originDescription}
                  onChange={(e) => setOriginDescription(e.target.value)}
                  required
                  minLength={8}
                  rows={3}
                  placeholder="Ex.: enviado pelo atendimento sindical após associação"
                />
              </label>
              <label>
                Observação / vigência (se souber)
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setStep(2)}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={originDescription.trim().length < 8}
                  onClick={() => setStep(4)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <fieldset>
                <legend>Compartilhamento</legend>
                <label>
                  <input
                    type="radio"
                    checked={sharingScope === 'PRIVATE'}
                    onChange={() => {
                      setSharingScope('PRIVATE');
                      setConsentAccepted(false);
                    }}
                  />{' '}
                  Uso privado (somente este escritório)
                </label>
                <label>
                  <input
                    type="radio"
                    checked={sharingScope === 'NETWORK_RELATED_UNION'}
                    onChange={() => setSharingScope('NETWORK_RELATED_UNION')}
                  />{' '}
                  Compartilhar com escritórios vinculados ao mesmo sindicato
                </label>
                <label>
                  <input
                    type="radio"
                    checked={sharingScope === 'NETWORK_GLOBAL'}
                    onChange={() => setSharingScope('NETWORK_GLOBAL')}
                  />{' '}
                  Compartilhar com toda a rede (quando permitido)
                </label>
              </fieldset>
              {sharingScope !== 'PRIVATE' ? (
                <label>
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                  />{' '}
                  {CONSENT}
                </label>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setStep(3)}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={sharingScope !== 'PRIVATE' && !consentAccepted}
                  onClick={() => setStep(5)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="stack">
              <p>
                <b>Arquivo:</b> {fileName || '—'}
              </p>
              <p>
                <b>Sindicato:</b> {union?.name || unionId}
              </p>
              <p>
                <b>Tipo:</b> {probableType}
              </p>
              <p>
                <b>Origem:</b> {originDescription}
              </p>
              <p>
                <b>Escopo:</b> {sharingScope}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setStep(4)}>
                  Voltar
                </button>
                <button className="primary" type="submit" disabled={busy}>
                  {busy ? 'Enviando…' : 'Enviar para processamento'}
                </button>
              </div>
            </div>
          )}

          {step === 6 && result && (
            <div className="stack">
              <p>
                <b>Documento recebido.</b> Processando…
              </p>
              <p>
                Tipo identificado: {result.document?.documentClass || probableType || '—'}
              </p>
              <p>Sindicato: {result.union?.name || '—'}</p>
              <p>Origem: Contribuição colaborativa</p>
              <p>
                Status:{' '}
                {result.sharingScope === 'PRIVATE'
                  ? 'Uso privado'
                  : result.moderationStatus === 'PENDING'
                    ? 'Aguardando validação'
                    : result.status}
              </p>
              <button type="button" className="primary" onClick={() => router.push('/rede')}>
                Ir para a rede
              </button>
            </div>
          )}
        </form>
      </div>
    </Shell>
  );
}
