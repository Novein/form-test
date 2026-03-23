import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import type { InspectionConfig } from '../../types/inspection';

const AboutPage: React.FC = () => {
  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInspectionConfig().then(setConfig).catch((err) => {
      setError(err instanceof Error ? err.message : '配置加载失败');
    });
  }, []);

  if (error) {
    return <div className="page-shell"><div className="page-card empty-state">{error}</div></div>;
  }

  if (!config) {
    return <div className="page-shell"><div className="page-card">加载配置中...</div></div>;
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Config Overview</div>
            <h1>配置说明 / 系统说明</h1>
            <p className="page-subtitle">
              当前系统已经支持配置驱动模板、本地 IndexedDB 存储、草稿续写、记录管理和导出预览。
            </p>
          </div>
          <Link className="secondary-button" to="/">
            返回首页
          </Link>
        </div>

        <div className="detail-grid">
          <div className="detail-item"><span>系统名称</span><strong>{config.appInfo.appName}</strong></div>
          <div className="detail-item"><span>配置版本</span><strong>{config.appInfo.version}</strong></div>
          <div className="detail-item"><span>默认模板</span><strong>{config.appInfo.defaultTemplateId}</strong></div>
          <div className="detail-item"><span>自动保存</span><strong>{config.appInfo.enableDraftAutoSave ? '已开启' : '未开启'}</strong></div>
        </div>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>基础选项</h2>
              <p>这些内容来自 `public/config/inspection-config.json`，调整配置即可更新系统选项。</p>
            </div>
          </div>
          <div className="tag-group">
            {config.baseOptions.shifts.map((item) => <span key={item.id} className="tag-chip">{item.label}</span>)}
            {config.baseOptions.productionLines.map((item) => <span key={item.id} className="tag-chip">{item.label}</span>)}
            {config.baseOptions.inspectionAreas.map((item) => <span key={item.id} className="tag-chip">{item.label}</span>)}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>模板清单</h2>
              <p>页面会根据模板分组和巡检项自动生成表单。</p>
            </div>
          </div>
          <div className="template-list">
            {config.templates.map((template) => (
              <div key={template.id} className="template-item">
                <div>
                  <strong>{template.name}</strong>
                  <p>{template.sections.length} 个分组，{template.sections.reduce((sum, section) => sum + section.items.length, 0)} 个巡检项</p>
                </div>
                <span className={template.enabled ? 'status-badge status-ok' : 'status-badge'}>
                  {template.enabled ? '启用中' : '已停用'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>第一阶段完成情况</h2>
            </div>
          </div>
          <div className="progress-list">
            <div className="progress-item"><strong>已完成</strong><span>配置驱动表单、本地存储、草稿自动保存、列表筛选、详情查看、导出预览</span></div>
            <div className="progress-item"><strong>当前导出方式</strong><span>浏览器打印 / 保存为 PDF，适合第一阶段纯前端落地</span></div>
            <div className="progress-item"><strong>后续可扩展</strong><span>真正的 PDF 库集成、签名、图片上传、后台同步和权限体系</span></div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
