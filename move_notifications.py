import re

with open('src/app/(dashboard)/settings/page.tsx', 'r') as f:
    content = f.read()

# Find the start of the WhatsApp card
start_idx = content.find('{/* WhatsApp Notification Card — FIRST */}')
# Find the end of the Email card. It ends with the "Guardar correos" button and its closing divs.
end_str = "Guardar correos'}\n                    </button>\n                  </div>\n                </div>"
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find the block boundaries")
    exit(1)

notification_block = content[start_idx:end_idx]

# Remove the block from the profile section
content = content[:start_idx] + content[end_idx:]

# We need to insert the new notifications section right before {/* BOT CONFIG SECTION */}
new_section = """
            {/* NOTIFICATIONS SECTION */}
            {activeSection === 'notifications' && (
              <div className="h-full flex flex-col p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in transition-all duration-500 overflow-y-auto">
                <header className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1 w-6 bg-[#F36A2D] rounded-full" />
                    <span className="text-[9px] font-black text-[#F36A2D] uppercase tracking-[0.2em]">Centro de Alertas</span>
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#EDE9E0] tracking-tight">Notificaciones</h2>
                </header>

                <div className="flex flex-col gap-6">
""" + "\n                  " + "\n                  ".join(notification_block.split('\n')) + """
                </div>
              </div>
            )}

"""

bot_config_idx = content.find('{/* BOT CONFIG SECTION */}')
if bot_config_idx == -1:
    print("Could not find bot config section")
    exit(1)

content = content[:bot_config_idx] + new_section + content[bot_config_idx:]

with open('src/app/(dashboard)/settings/page.tsx', 'w') as f:
    f.write(content)

print("Successfully moved notifications section")
