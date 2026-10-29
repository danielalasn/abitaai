/**
 * Almacén en memoria exclusivo para el cliente (módulo frontend).
 * Preserva la lista de chats y detalles de chat abiertos mientras la sesión esté activa en la pestaña,
 * permitiendo que al navegar entre Bandeja y Dashboard el renderizado del Inbox sea instantáneo (0ms).
 * No persiste en disco (privacidad de PII).
 */

let memoryChats: any[] | null = null;
let memoryChatsMap: Record<string, any> = {};

export function getMemoryChats(): any[] | null {
  return memoryChats;
}

export function setMemoryChats(chats: any[]): void {
  memoryChats = chats;
}

export function getMemoryChatDetail(chatId: string): any | null {
  return memoryChatsMap[chatId] || null;
}

export function setMemoryChatDetail(chatId: string, detail: any): void {
  if (!chatId || !detail) return;
  memoryChatsMap[chatId] = detail;
}

export function getMemoryChatsMap(): Record<string, any> {
  return memoryChatsMap;
}

export function clearMemoryInbox(): void {
  memoryChats = null;
  memoryChatsMap = {};
}
