import { useEffect, useRef, useState } from "react";
import { ChevronLeft, LogOut, Moon, Sun, Store, X, Ellipsis } from "lucide-react";
import { getTabsFor, splitForMobile, initialOf } from "./navConfig";
import "./Nav.css";

// لما الكيبورد يفتح (حقل نص مفعّل) بنخبي الشريط السفلي عشان ما يطلع فوق الكيبورد
function useHideOnKeyboard() {
  useEffect(() => {
    const root = document.documentElement;
    const isField = (el) =>
      el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && !["checkbox", "radio", "button", "submit"].includes(el.type);
    let t;
    const on = (e) => {
      clearTimeout(t);
      if (isField(e.target)) root.classList.add("nv-kb");
    };
    const off = () => {
      clearTimeout(t);
      t = setTimeout(() => root.classList.remove("nv-kb"), 80);
    };
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
      clearTimeout(t);
      root.classList.remove("nv-kb");
    };
  }, []);
}

function Sheet({ title, onClose, children }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="nv-overlay" onMouseDown={onClose}>
      <div className="nv-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <span className="nv-grab" aria-hidden="true" />
        <div className="nv-sheet-head">
          <h2>{title}</h2>
          <button ref={closeRef} className="nv-x" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MobileNav({
  activeTab,
  onChange,
  role,
  username,
  roleLabel,
  roleColor,
  onLogout,
  themeMode,
  onToggleTheme,
  pageTitle,
}) {
  const { bar, more } = splitForMobile(getTabsFor(role));
  const moreActive = more.some((t) => t.id === activeTab);
  const dark = themeMode === "dark";
  const [sheet, setSheet] = useState(null); // "more" | "account" | null
  const closeSheet = () => setSheet(null);
  useHideOnKeyboard();

  function go(id) {
    onChange(id);
    setSheet(null);
  }

  return (
    <>
      <header className="nv-m-header">
        <span className="nv-logo nv-logo--sm" aria-hidden="true">
          <Store size={18} strokeWidth={2.2} />
        </span>
        <h1 className="nv-m-title">{pageTitle}</h1>
        <button
          className="nv-avatar nv-avatar--btn"
          style={{ background: "#fff", color: "var(--nv-bar)", boxShadow: `0 0 0 2.5px ${roleColor.text}` }}
          onClick={() => setSheet("account")}
          aria-haspopup="dialog"
          aria-label={`حسابي: ${username}`}
        >
          {initialOf(username)}
        </button>
      </header>

      <nav className="nv-bottom" aria-label="التنقل الرئيسي">
        {bar.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`nv-b-item${active ? " is-active" : ""}`}
              onClick={() => go(t.id)}
              aria-current={active ? "page" : undefined}
            >
              <span className="nv-b-ic">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span className="nv-b-label">{t.short || t.label}</span>
            </button>
          );
        })}
        {more.length > 0 && (
          <button
            className={`nv-b-item${moreActive ? " is-active" : ""}`}
            onClick={() => setSheet("more")}
            aria-haspopup="dialog"
          >
            <span className="nv-b-ic">
              <Ellipsis size={22} />
            </span>
            <span className="nv-b-label">المزيد</span>
          </button>
        )}
      </nav>

      {sheet === "more" && (
        <Sheet title="المزيد" onClose={closeSheet}>
          <div className="nv-rows">
            {more.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} className={`nv-row${activeTab === t.id ? " is-active" : ""}`} onClick={() => go(t.id)}>
                  <span className="nv-row-ic">
                    <Icon size={20} />
                  </span>
                  <span className="nv-row-text">
                    <b>{t.label}</b>
                    <small>{t.desc}</small>
                  </span>
                  <ChevronLeft size={18} className="nv-row-chev" />
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {sheet === "account" && (
        <Sheet title="حسابي" onClose={closeSheet}>
          <div className="nv-acc">
            <span className="nv-avatar nv-avatar--lg" style={{ background: roleColor.bg, color: roleColor.text }}>
              {initialOf(username)}
            </span>
            <div>
              <b>{username}</b>
              <small style={{ color: roleColor.text, background: roleColor.bg }}>{roleLabel}</small>
            </div>
          </div>

          <button className="nv-row" role="switch" aria-checked={dark} onClick={onToggleTheme}>
            <span className="nv-row-ic">{dark ? <Moon size={20} /> : <Sun size={20} />}</span>
            الوضع الداكن
            <span className={`nv-switch${dark ? " on" : ""}`} aria-hidden="true" />
          </button>

          <button
            className="nv-logout"
            onClick={() => {
              closeSheet();
              onLogout();
            }}
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </Sheet>
      )}
    </>
  );
}