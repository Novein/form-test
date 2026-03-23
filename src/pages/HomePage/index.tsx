import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { getAllRecords } from '../../services/storageService';

const HomePage: React.FC = () => {
  const [stats, setStats] = useState({
    workers: 0,
    templates: 0,
    drafts: 0,
    submitted: 0,
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([loadInspectionConfig(), getAllRecords()]).then(([config, records]) => {
      if (!mounted) {
        return;
      }

      setStats({
        workers: config.workers.filter((item) => item.enabled).length,
        templates: config.templates.filter((item) => item.enabled).length,
        drafts: records.filter((item) => item.status === 'draft').length,
        submitted: records.filter((item) => item.status === 'submitted').length,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page-shell">
      <div className="hero-card">
        <div className="eyebrow">Inspection Workspace</div>
        <h1>巡检无纸化系统</h1>
        <p className="page-subtitle">
          面向 iPad 现场操作的巡检记录工具，支持配置驱动表单、本地草稿、记录管理和导出预览。
        </p>
        <div className="stats-grid">
          <div className="stat-card"><span>启用工人</span><strong>{stats.workers}</strong></div>
          <div className="stat-card"><span>巡检模板</span><strong>{stats.templates}</strong></div>
          <div className="stat-card"><span>草稿记录</span><strong>{stats.drafts}</strong></div>
          <div className="stat-card"><span>已提交</span><strong>{stats.submitted}</strong></div>
        </div>
      </div>

      <div className="action-grid">
        <Link className="action-card" to="/new">
          <span className="action-kicker">01</span>
          <h2>新建巡检记录</h2>
          <p>先选择工人、班次、产线和模板，再进入巡检填写页。</p>
        </Link>
        <Link className="action-card" to="/records">
          <span className="action-kicker">02</span>
          <h2>查看记录列表</h2>
          <p>统一管理草稿与已提交记录，支持筛选、编辑、删除和批量导出。</p>
        </Link>
        <Link className="action-card" to="/export">
          <span className="action-kicker">03</span>
          <h2>合并导出预览</h2>
          <p>从已提交记录中进入预览页，确认汇总内容后直接打印或保存为 PDF。</p>
        </Link>
        <Link className="action-card" to="/about">
          <span className="action-kicker">04</span>
          <h2>配置说明</h2>
          <p>查看系统配置、模板结构和当前版本支持的业务能力。</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
