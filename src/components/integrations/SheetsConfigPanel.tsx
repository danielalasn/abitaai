'use client';

import { useState, useEffect } from 'react';
import { getSheetsConfig, saveSheetsConfig, SheetTable } from '@/app/actions/sheets';
import { Loader2, CheckCircle2, X, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface SheetsConfigPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectId?: string;
}

const emptyTable = (): SheetTable => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'strict',
  spreadsheetId: '',
  sheetName: 'Sheet1',
  instructions: '',
  queryColumn: '',
  readColumns: [],
});

export default function SheetsConfigPanel({ isOpen, onClose, projectId }: SheetsConfigPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [tables, setTables] = useState<SheetTable[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-table column state (not persisted, only for UI)
  const [availableColumns, setAvailableColumns] = useState<Record<string, string[]>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [verifyError, setVerifyError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getSheetsConfig().then(data => {
      const loaded = data.length > 0 ? data : [emptyTable()];
      setTables(loaded);
      setExpandedId(loaded[0]?.id ?? null);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [isOpen]);

  const updateTable = (id: string, patch: Partial<SheetTable>) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const addTable = () => {
    const t = emptyTable();
    setTables(prev => [...prev, t]);
    setExpandedId(t.id);
  };

  const removeTable = (id: string) => {
    setTables(prev => {
      const next = prev.filter(t => t.id !== id);
      if (expandedId === id) setExpandedId(next[0]?.id ?? null);
      return next.length > 0 ? next : [emptyTable()];
    });
    setAvailableColumns(prev => { const n = { ...prev }; delete n[id]; return n; });
    setVerifyError(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const verifyColumns = async (table: SheetTable) => {
    if (!table.spreadsheetId || !projectId) return;
    setVerifying(p => ({ ...p, [table.id]: true }));
    setVerifyError(p => ({ ...p, [table.id]: '' }));
    try {
      const res = await fetch(
        `/api/integrations/sheets/columns?projectId=${projectId}&spreadsheetId=${table.spreadsheetId}&sheetName=${encodeURIComponent(table.sheetName)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al verificar');
      setAvailableColumns(p => ({ ...p, [table.id]: data.columns }));
      // Reset columns that no longer exist
      updateTable(table.id, {
        queryColumn: data.columns.includes(table.queryColumn) ? table.queryColumn : '',
        readColumns: table.readColumns.filter((c: string) => data.columns.includes(c)),
      });
    } catch (err: unknown) {
      setVerifyError(p => ({ ...p, [table.id]: err instanceof Error ? err.message : 'Error desconocido' }));
    } finally {
      setVerifying(p => ({ ...p, [table.id]: false }));
    }
  };

  const toggleReadColumn = (tableId: string, col: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const has = t.readColumns.includes(col);
      return { ...t, readColumns: has ? t.readColumns.filter(c => c !== col) : [...t.readColumns, col] };
    }));
  };

  const handleSave = async () => {
    for (const t of tables) {
      if (!t.spreadsheetId.trim()) {
        alert('Todas las tablas deben tener un ID de spreadsheet.');
        return;
      }
      const isStrict = (t.type ?? 'strict') === 'strict';
      if (isStrict && !t.queryColumn) {
        alert(`La tabla "${t.name || 'sin nombre'}" es tipo Estricta y debe tener una columna de búsqueda.`);
        return;
      }
    }
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await saveSheetsConfig(tables);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <Loader2 className="animate-spin text-green-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1714] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.5" />
                <path d="M3 10h18M9 4v16M15 4v16" stroke="#dadce0" strokeWidth="1.5" />
                <rect x="3" y="4" width="6" height="6" fill="#34a853" rx="2" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-[#EDE9E0]">Bases de datos (Google Sheets)</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configura qué hojas puede consultar el bot y cuándo hacerlo.
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {tables.map((table, idx) => {
            const isExpanded = expandedId === table.id;
            const cols = availableColumns[table.id] || [];
            const hasVerified = cols.length > 0;
            const isVerifying = verifying[table.id];
            const vError = verifyError[table.id];

            return (
              <div key={table.id} className="border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                {/* Table Header / Toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : table.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
                      {table.name || `Tabla ${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tables.length > 1 && (
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); removeTable(table.id); }}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 size={14} />
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-5 space-y-5">

                    {/* Table Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Nombre de la tabla</label>
                      <p className="text-[10px] text-zinc-500">Un nombre interno para identificar esta tabla (ej: "Inventario").</p>
                      <input
                        type="text"
                        value={table.name || ''}
                        onChange={e => updateTable(table.id, { name: e.target.value })}
                        placeholder="Ej: Inventario"
                        className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-green-500 transition-colors"
                      />
                    </div>

                    {/* Table Type Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Tipo de tabla</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateTable(table.id, { type: 'strict', queryColumn: '' })}
                          className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                            (table.type ?? 'strict') === 'strict'
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                          }`}
                        >
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Estricta</span>
                          <span className="text-[10px] text-zinc-500 leading-snug">Solo responde con el ID exacto del cliente (ej: teléfono). Ideal para pedidos, cuentas, expedientes.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTable(table.id, { type: 'flexible', queryColumn: '' })}
                          className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                            table.type === 'flexible'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                          }`}
                        >
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Flexible</span>
                          <span className="text-[10px] text-zinc-500 leading-snug">El bot pregunta primero, luego filtra. Ideal para catálogos, inventarios, listas de productos.</span>
                        </button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">¿Cuándo debe el bot usar esta tabla?</label>
                      <p className="text-[10px] text-zinc-500">Ej: "Cuando el cliente pregunte por el estado de su pedido"</p>
                      <textarea
                        value={table.instructions}
                        onChange={e => updateTable(table.id, { instructions: e.target.value })}
                        rows={2}
                        placeholder="Usa esta tabla cuando el cliente pregunte sobre..."
                        className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-green-500 resize-none transition-colors"
                      />
                    </div>

                    {/* Spreadsheet ID */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">ID del Spreadsheet</label>
                        {table.spreadsheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${table.spreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-green-600 hover:underline"
                          >
                            <ExternalLink size={10} /> Abrir en Drive
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        El código en la URL: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-[10px]">docs.google.com/spreadsheets/d/<strong>ID</strong>/edit</code>
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={table.spreadsheetId}
                          onChange={e => {
                            updateTable(table.id, { spreadsheetId: e.target.value.trim() });
                            // Reset columns when ID changes
                            setAvailableColumns(p => { const n = { ...p }; delete n[table.id]; return n; });
                          }}
                          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                          className="flex-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-green-500 font-mono transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => verifyColumns(table)}
                          disabled={!table.spreadsheetId || isVerifying}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-xs font-bold hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                        >
                          {isVerifying
                            ? <><Loader2 size={12} className="animate-spin" /> Verificando...</>
                            : <><RefreshCw size={12} /> Verificar</>}
                        </button>
                      </div>
                      {vError && (
                        <div className="flex items-start gap-1.5 text-[10px] text-red-500">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" />
                          {vError}
                        </div>
                      )}
                    </div>

                    {/* Sheet Name - only shown, tied to verify */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Nombre de la pestaña</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={table.sheetName}
                          onChange={e => {
                            updateTable(table.id, { sheetName: e.target.value });
                            setAvailableColumns(p => { const n = { ...p }; delete n[table.id]; return n; });
                          }}
                          placeholder="Sheet1"
                          className="flex-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-green-500 transition-colors"
                        />
                        {!hasVerified && (
                          <span className="text-[10px] text-zinc-400">Haz clic en "Verificar" para cargar las columnas</span>
                        )}
                      </div>
                    </div>

                    {/* Column selectors - only after verify */}
                    {hasVerified && (
                      <>
                         {/* Query column - only for strict OR flexible filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {(table.type ?? 'strict') === 'strict'
                              ? <>Columna de búsqueda <span className="text-red-400">*</span></>
                              : 'Columna de filtro principal (opcional)'}
                          </label>
                          <p className="text-[10px] text-zinc-500">
                            {(table.type ?? 'strict') === 'strict'
                              ? 'El bot buscará al cliente usando el valor exacto de esta columna (ej: Teléfono, Email, Número de orden).'
                              : 'Si se selecciona, la IA intentará recolectar un filtro para esta columna antes de buscar. Si no, buscará por la columna que el cliente mencione.'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {cols.map(col => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => updateTable(table.id, { queryColumn: table.queryColumn === col ? '' : col })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  table.queryColumn === col
                                    ? (table.type === 'flexible' ? 'bg-blue-500 text-white border-blue-500' : 'bg-green-500 text-white border-green-500')
                                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-green-400'
                                }`}
                              >
                                {col}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Columns to read */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Columnas a leer y reportar al cliente</label>
                          <p className="text-[10px] text-zinc-500">Selecciona todas las columnas cuyo valor puede necesitar el bot para responderle al cliente.</p>
                          <div className="flex flex-wrap gap-2">
                            {cols.filter(c => c !== table.queryColumn).map(col => {
                              const selected = table.readColumns.includes(col);
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => toggleReadColumn(table.id, col)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${selected
                                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/40'
                                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-green-400'
                                    }`}
                                >
                                  {selected && <CheckCircle2 size={10} />}
                                  {col}
                                </button>
                              );
                            })}
                          </div>
                          {table.readColumns.length === 0 && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">Selecciona al menos una columna para que el bot pueda leer información.</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Show summary if verified */}
                    {hasVerified && table.readColumns.length > 0 && (
                      <div className={`p-3 rounded-xl border ${
                        table.type === 'flexible'
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
                          : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40'
                      }`}>
                        <p className={`text-[10px] leading-relaxed ${
                          table.type === 'flexible' ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
                        }`}>
                          {(table.type ?? 'strict') === 'strict'
                            ? <>Búsqueda exacta por <strong>{table.queryColumn || '(sin columna)'}</strong>. Leerá: <strong>{table.readColumns.join(', ')}</strong>.</>                            
                            : <>Catálogo flexible. La IA {table.queryColumn ? <>pedirá un filtro para "<strong>{table.queryColumn}</strong>"</> : 'preguntará para filtrar'} antes de buscar. Columnas disponibles: <strong>{table.readColumns.join(', ')}</strong>.</>}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Table */}
          <button
            type="button"
            onClick={addTable}
            className="w-full py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-500 hover:border-green-400 hover:text-green-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar otra tabla
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] py-3 rounded-xl text-xs font-black tracking-tight shadow-md hover:bg-green-600 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : saveStatus === 'success'
                ? <><CheckCircle2 size={16} /> ¡Guardado!</>
                : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
