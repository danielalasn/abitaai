'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { updateProfile, verifyCurrentPassword } from '@/app/actions/client';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session, update } = useSession();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isOpen && session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setIsPasswordVerified(false);
      setIsVerifying(false);
      setMessage(null);
    }
  }, [isOpen, session]);

  const handleVerifyPassword = async () => {
    if (!currentPassword) return;
    setIsVerifying(true);
    const result = await verifyCurrentPassword(currentPassword);
    if (result.success) {
      setIsPasswordVerified(true);
      setMessage(null);
    } else {
      setMessage({ type: 'error', text: 'La contraseña actual es incorrecta.' });
    }
    setIsVerifying(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showPasswordSection && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await updateProfile({
      name,
      email,
      currentPassword: showPasswordSection ? currentPassword : undefined,
      newPassword: showPasswordSection ? newPassword : undefined
    });

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      // Actualizar la sesión del lado del cliente para reflejar el nuevo nombre/email
      await update({
        ...session,
        user: {
          ...session?.user,
          name,
          email
        }
      });
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#E9E4D8] dark:bg-[#1A1714] w-full max-w-md rounded-3xl shadow-2xl border border-[#DEDAD0] dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DEDAD0] dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-zinc-900 dark:bg-[#EDE9E0] text-white dark:text-zinc-900 rounded-lg flex items-center justify-center font-bold">
              {name.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="text-lg font-semibold text-[#111111] dark:text-[#EDE9E0]">Mi Perfil</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#6F6F6F]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar">
            
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-2.5 outline-none focus:border-[#F36A2D] transition-all text-sm text-[#111111] dark:text-[#EDE9E0]"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6F6F6F]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-2.5 outline-none focus:border-[#F36A2D] transition-all text-sm text-[#111111] dark:text-[#EDE9E0]"
                />
              </div>
            </div>

            {/* Password Trigger */}
            {!showPasswordSection ? (
              <button 
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="text-[11px] font-bold text-[#F36A2D] hover:underline flex items-center gap-2 mt-1"
              >
                <Lock size={13} />
                ¿Deseas cambiar tu contraseña?
              </button>
            ) : (
              <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#F36A2D] uppercase tracking-widest">Cambio de Seguridad</span>
                    <button type="button" onClick={() => setShowPasswordSection(false)} className="text-[10px] text-[#6F6F6F] hover:underline">Cancelar</button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      disabled={isPasswordVerified || isVerifying}
                      required={showPasswordSection}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-white dark:bg-[#111111]/40 border ${isPasswordVerified ? 'border-green-500/50' : 'border-[#DEDAD0] dark:border-zinc-800'} rounded-2xl pl-4 pr-24 py-2.5 outline-none focus:border-[#F36A2D] transition-all text-sm text-[#111111] dark:text-[#EDE9E0] disabled:opacity-70`}
                    />
                    {!isPasswordVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyPassword}
                        disabled={!currentPassword || isVerifying}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 rounded-xl bg-[#F36A2D] text-white text-[9px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        {isVerifying ? <Loader2 size={11} className="animate-spin" /> : 'Verificar'}
                      </button>
                    )}
                    {isPasswordVerified && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 flex items-center gap-1 text-[10px] font-bold">
                        <ShieldCheck size={14} />
                        Ok
                      </div>
                    )}
                  </div>
                </div>

                {isPasswordVerified && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                        Nueva Contraseña
                      </label>
                      <input
                        type={showPass ? "text" : "password"}
                        required={showPasswordSection}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl px-4 py-2.5 outline-none focus:border-[#F36A2D] transition-all text-sm text-[#111111] dark:text-[#EDE9E0]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-widest ml-1">
                        Confirmar Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          required={showPasswordSection}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white dark:bg-[#111111]/40 border border-[#DEDAD0] dark:border-zinc-800 rounded-2xl px-4 py-2.5 outline-none focus:border-[#F36A2D] transition-all text-sm text-[#111111] dark:text-[#EDE9E0]"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white"
                        >
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {message && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-2 animate-in slide-in-from-top-1 ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400' 
                  : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                {message.text}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#DEDAD0] dark:border-zinc-800 bg-[#DEDAD0]/20 dark:bg-zinc-900/20 shrink-0">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 rounded-2xl font-bold text-sm bg-[#111111] dark:bg-[#EDE9E0] text-white dark:text-[#111111] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:scale-100"
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
