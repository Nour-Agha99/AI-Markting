import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, Sun, Store, Ellipsis, SlidersHorizontal } from "lucide-react";
import { getTabsFor, initialOf, useDismiss } from "./navConfig";
import "./Nav.css";

export default function TopNav({
  activeTab,
  onChange,
  role,
  username,
  roleLabel,
  roleColor,
  onLogout,
  themeMode,
  onToggleTheme,
}) {
  const tabs = getTabsFor(role);
  const main = tabs.filter((t) => !t.more);
  const more = tabs.filter((t) => t.more);
  const moreActive = more.some((t) => t.id === activeTab);
  const moreLabel = more.length && more.every((t) => t.group === more[0].group) && more[0].group ? more[0].group : "المزيد";
  const MoreIcon = moreLabel === "المزيد" ? Ellipsis : SlidersHorizontal;
  const dark = themeMode === "dark";

  const [menu, setMenu] = useState(null); // "more" | "user" | null
  const wrapRef = useRef(null);
  const close = useCallback(() => setMenu(null), [setMenu]);
  useDismiss(!!menu, wrapRef, close);

  // الكبسولة البيضاء المنزلقة: بنقيس مكان التبويب النشط وبنحرّكها له
  const tabsRef = useRef(null);
  const itemRefs = useRef({});
  const [ind, setInd] = useState(null);
  const [ready, setReady] = useState(false);
  const activeKey = moreActive ? "__more" : activeTab;

  const measure = useCallback(() => {
    const root = tabsRef.current;
    const el = itemRefs.current[activeKey];
    if (!root || !el) return setInd(null);
    const r = root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setInd({ left: b.left - r.left, width: b.width });
  }, [activeKey]);

  useLayoutEffect(() => {
    measure();
  }, [measure, tabs.length]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (tabsRef.current) ro.observe(tabsRef.current);
    Object.values(itemRefs.current).forEach((el) => el && ro.observe(el));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure, tabs.length]);

  useEffect(() => {
    if (!ind || ready) return;
    const id = requestAnimationFrame(() => setReady(true)); // أول ظهور بدون حركة
    return () => cancelAnimationFrame(id);
  }, [ind, ready]);

  function go(id) {
    onChange(id);
    setMenu(null);
  }

  const avatarStyle = { background: "#fff", color: "var(--nv-bar)", boxShadow: `0 0 0 2.5px ${roleColor.text}` };

  return (
    <header className="nv-top" ref={wrapRef}>
      <div className="nv-top-inner">
        <div className="nv-brand">
          <span className="nv-logo" aria-hidden="true">
            <Store size={20} strokeWidth={2.2} />
          </span>
          <span>المتجر الذكي</span>
        </div>

        <nav className={`nv-tabs${ind ? " has-ind" : ""}`} ref={tabsRef} aria-label="التنقل الرئيسي">
          {ind && (
            <span
              className={`nv-ind${ready ? " is-ready" : ""}`}
              style={{ width: ind.width, transform: `translateX(${ind.left}px)` }}
              aria-hidden="true"
            />
          )}

          {main.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => (itemRefs.current[t.id] = el)}
                className={`nv-tab${active ? " is-active" : ""}`}
                onClick={() => go(t.id)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
                {t.label}
              </button>
            );
          })}

          {more.length > 0 && (
            <div className="nv-more">
              <button
                ref={(el) => (itemRefs.current.__more = el)}
                className={`nv-tab${moreActive ? " is-active" : ""}`}
                onClick={() => setMenu(menu === "more" ? null : "more")}
                aria-haspopup="menu"
                aria-expanded={menu === "more"}
              >
                <MoreIcon size={18} />
                {moreLabel}
                <ChevronDown size={14} className={menu === "more" ? "nv-flip" : ""} />
              </button>
              {menu === "more" && (
                <div className="nv-menu nv-menu--cards" role="menu">
                  {more.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        role="menuitem"
                        className={`nv-card${activeTab === t.id ? " is-active" : ""}`}
                        onClick={() => go(t.id)}
                      >
                        <span className="nv-card-ic">
                          <Icon size={20} />
                        </span>
                        <span className="nv-card-text">
                          <b>{t.label}</b>
                          <small>{t.desc}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="nv-user">
          <button
            className="nv-avatar-btn"
            onClick={() => setMenu(menu === "user" ? null : "user")}
            aria-haspopup="menu"
            aria-expanded={menu === "user"}
            aria-label="قائمة الحساب"
          >
            <span className="nv-avatar" style={avatarStyle}>
              {initialOf(username)}
            </span>
            <span className="nv-user-text">
              <b>{username}</b>
              <small>{roleLabel}</small>
            </span>
            <ChevronDown size={14} className={menu === "user" ? "nv-flip" : ""} />
          </button>

          {menu === "user" && (
            <div className="nv-menu" role="menu">
              <div className="nv-menu-head">
                <span className="nv-avatar nv-avatar--lg" style={{ background: roleColor.bg, color: roleColor.text }}>
                  {initialOf(username)}
                </span>
                <div>
                  <b>{username}</b>
                  <small style={{ color: roleColor.text }}>{roleLabel}</small>
                </div>
              </div>
              <button className="nv-item" role="menuitemcheckbox" aria-checked={dark} onClick={onToggleTheme}>
                {dark ? <Moon size={18} /> : <Sun size={18} />}
                الوضع الداكن
                <span className={`nv-switch${dark ? " on" : ""}`} aria-hidden="true" />
              </button>
              <button className="nv-item nv-item--danger" role="menuitem" onClick={onLogout}>
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}