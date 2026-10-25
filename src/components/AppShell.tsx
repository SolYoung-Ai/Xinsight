import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarClock,
  Database,
  FileBarChart,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Stethoscope,
  Sun,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../state/DataContext';
import { DataStatusBar } from './DataStatusBar';
import { HelpDialog } from './HelpDialog';
import { PrivacyDialog } from './PrivacyDialog';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import styles from './App.module.css';

const NAV = [
  { to: '/', label: '总览 Dashboard', icon: LayoutDashboard, end: true },
  { to: '/posts', label: '内容表现 Posts', icon: FileText },
  { to: '/trends', label: '流量趋势 Trends', icon: TrendingUp },
  { to: '/publishing', label: '发帖分析 Publishing', icon: CalendarClock },
  { to: '/diagnostics', label: '数据诊断 Diagnostics', icon: Stethoscope },
  { to: '/reports', label: '分析报告 Reports', icon: FileBarChart },
  { to: '/data', label: '数据管理 Data', icon: Database },
];

export function AppShell() {
  const { dataset, ready, theme, toggleTheme, clearAll } = useData();
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!ready) {
    return (
      <div className={styles.boot}>
        <div className={styles.spinner} />
        <div className="muted small">正在准备…</div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div>
            <div className={styles.brandName}>X Account Insight</div>
            <div className={styles.brandSub}>X 账号运营数据分析</div>
          </div>
        </div>
        <div className={styles.topbarStatus}>
          <DataStatusBar />
        </div>
        <div className="spacer" />
        <button className={styles.iconBtn} onClick={() => setHelpOpen(true)} title="帮助" aria-label="帮助">
          <HelpCircle size={17} />
        </button>
        <button className={styles.iconBtn} onClick={() => setPrivacyOpen(true)} title="隐私说明" aria-label="隐私说明">
          <ShieldCheck size={17} />
        </button>
        <button className={styles.iconBtn} onClick={toggleTheme} title="切换深色模式" aria-label="切换深色模式">
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        {dataset ? (
          <button className={[styles.iconBtn, styles.clearBtn].join(' ')} onClick={() => setConfirmClear(true)} title="清除所有数据" aria-label="清除所有数据">
            <Trash2 size={17} />
          </button>
        ) : null}
      </header>

      <div className={styles.shellBody}>
        {dataset ? (
          <aside className={styles.sidebar}>
            <div className={styles.navSection}>分析模块</div>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
              >
                <n.icon size={17} strokeWidth={1.9} />
                {n.label}
              </NavLink>
            ))}
          </aside>
        ) : null}
        <main className={styles.main}>
          {dataset ? <Outlet /> : <Outlet />}
        </main>
      </div>

      <footer className={styles.footer}>
        <a
          href="https://solyoung.top"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          由 @SolYoung 构建
        </a>
      </footer>

      {dataset ? (
        <nav className={styles.bottomNav}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => [styles.bottomItem, isActive ? styles.bottomItemActive : ''].join(' ')}
            >
              <n.icon size={19} strokeWidth={1.9} />
              <span>{n.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}

      <Modal
        open={confirmClear}
        title="清除所有数据"
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
            >
              确认清除
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          将清除当前会话中的所有导入数据、计算结果、图表缓存，以及（如已开启）浏览器本地保存的数据。此操作不可撤销。
        </p>
      </Modal>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <Toast />
    </div>
  );
}
