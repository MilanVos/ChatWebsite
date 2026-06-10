import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuGroup {
  items: MenuItem[];
}

interface ContextMenuState {
  x: number;
  y: number;
  groups: MenuGroup[];
}

const ContextMenu: React.FC = () => {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const buildMenuGroups = useCallback((e: MouseEvent): MenuGroup[] => {
    const target = e.target as HTMLElement;
    const groups: MenuGroup[] = [];

    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const isLink = target.tagName === 'A' || target.closest('a') !== null;
    const isImage = target.tagName === 'IMG';
    const selectedText = window.getSelection()?.toString().trim() || '';
    const linkEl = target.closest('a') as HTMLAnchorElement | null;

    const clipboardGroup: MenuItem[] = [];

    if (selectedText) {
      clipboardGroup.push({
        label: 'Copy',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        action: () => navigator.clipboard.writeText(selectedText),
      });
    }

    if (isInput) {
      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;

      if (!selectedText) {
        clipboardGroup.push({
          label: 'Copy',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          action: () => {
            const val = 'value' in inputEl ? inputEl.value : '';
            navigator.clipboard.writeText(val);
          },
          disabled: !('value' in inputEl && (inputEl as HTMLInputElement).value),
        });

        clipboardGroup.push({
          label: 'Cut',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          ),
          action: () => document.execCommand('cut'),
        });
      } else {
        clipboardGroup.push({
          label: 'Cut',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          ),
          action: () => navigator.clipboard.writeText(selectedText).then(() => document.execCommand('delete')),
        });
      }

      clipboardGroup.push({
        label: 'Paste',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text);
          } catch {}
        },
      });

      clipboardGroup.push({
        label: 'Select All',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        ),
        action: () => {
          if ('select' in inputEl) (inputEl as HTMLInputElement).select();
          else document.execCommand('selectAll');
        },
      });
    }

    if (clipboardGroup.length > 0) {
      groups.push({ items: clipboardGroup });
    }

    if (isLink && linkEl?.href) {
      groups.push({
        items: [
          {
            label: 'Open Link',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            ),
            action: () => window.open(linkEl.href, '_blank', 'noopener'),
          },
          {
            label: 'Copy Link',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ),
            action: () => navigator.clipboard.writeText(linkEl.href),
          },
        ],
      });
    }

    if (isImage) {
      const imgEl = target as HTMLImageElement;
      groups.push({
        items: [
          {
            label: 'Copy Image Link',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ),
            action: () => navigator.clipboard.writeText(imgEl.src),
          },
          {
            label: 'Open Image',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            ),
            action: () => window.open(imgEl.src, '_blank', 'noopener'),
          },
        ],
      });
    }

    if (groups.length === 0 && !selectedText) {
      groups.push({
        items: [
          {
            label: 'Select All',
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ),
            action: () => document.execCommand('selectAll'),
          },
        ],
      });
    }

    return groups;
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const groups = buildMenuGroups(e);
      if (groups.length === 0) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = 200;
      const menuH = groups.reduce((acc, g) => acc + g.items.length * 36 + 8, 8);

      setMenu({
        x: Math.min(e.clientX, vw - menuW - 8),
        y: Math.min(e.clientY, vh - menuH - 8),
        groups,
      });
    };

    const handleClose = () => setMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClose);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [buildMenuGroups]);

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-discord-dark border border-discord-darker rounded-md shadow-2xl py-1 min-w-[180px]"
      style={{ left: menu.x, top: menu.y }}
      onClick={e => e.stopPropagation()}
    >
      {menu.groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="my-1 border-t border-discord-lighter/50" />}
          {group.items.map((item, ii) => (
            <button
              key={ii}
              disabled={item.disabled}
              onClick={() => { item.action(); setMenu(null); }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors text-left
                ${item.disabled
                  ? 'text-discord-text-muted cursor-not-allowed opacity-50'
                  : item.danger
                    ? 'text-discord-red hover:bg-discord-red hover:text-white rounded'
                    : 'text-discord-text hover:bg-discord-accent hover:text-white rounded'
                }`}
            >
              {item.icon && <span className="flex-shrink-0 opacity-70">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
