import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { getAllRecords } from '../../services/storageService';
import type { InspectionConfig, InspectionRecord } from '../../types/inspection';

const LAST_SELECTION_KEY = 'inspection:last-selection';

const NewRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [error, setError] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftId, setShiftId] = useState('');
  const [lineId, setLineId] = useState('');
  const [templateId, setTemplateId] = useState('');

  useEffect(() => {
    Promise.all([loadInspectionConfig(), getAllRecords()])
      .then(([loadedConfig, loadedRecords]) => {
        setConfig(loadedConfig);
        setRecords(loadedRecords);

        const savedSelection = localStorage.getItem(LAST_SELECTION_KEY);
        if (savedSelection) {
          const parsed = JSON.parse(savedSelection) as {
            workerId?: string;
            shiftId?: string;
            lineId?: string;
            templateId?: string;
          };
          setWorkerId(parsed.workerId ?? '');
          setShiftId(parsed.shiftId ?? '');
          setLineId(parsed.lineId ?? '');
          setTemplateId(parsed.templateId ?? loadedConfig.appInfo.defaultTemplateId);
        } else {
          setTemplateId(loadedConfig.appInfo.defaultTemplateId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '页面初始化失败');
      });
  }, []);

  const matchedDraft = useMemo(() => {
    return records.find(
      (item) =>
        item.status === 'draft' &&
        item.workerId === workerId &&
        item.shiftId === shiftId &&
        item.productionLineId === lineId &&
        item.templateId === templateId &&
        item.inspectionDate === date
    );
  }, [records, workerId, shiftId, lineId, templateId, date]);

  const availableTemplates = useMemo(() => {
    if (!config) {
      return [];
    }
    return config.templates.filter(
      (item) => item.enabled && (!lineId || item.applicableLineIds.includes(lineId))
    );
  }, [config, lineId]);

  useEffect(() => {
    if (templateId || availableTemplates.length === 0) {
      return;
    }
    setTemplateId(availableTemplates[0].id);
  }, [availableTemplates, templateId]);

  const handleStart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workerId || !date || !shiftId || !lineId || !templateId) {
      setError('请先完整选择本次巡检的基础信息。');
      return;
    }

    localStorage.setItem(
      LAST_SELECTION_KEY,
      JSON.stringify({ workerId, shiftId, lineId, templateId })
    );

    if (matchedDraft) {
      navigate(`/form?recordId=${matchedDraft.id}`);
      return;
    }

    navigate(
      `/form?workerId=${workerId}&date=${date}&shiftId=${shiftId}&lineId=${lineId}&templateId=${templateId}`
    );
  };

  if (error && !config) {
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
            <div className="eyebrow">New Inspection</div>
            <h1>新建巡检记录</h1>
            <p className="page-subtitle">先确认基础信息，再进入巡检填写页。相同条件下的草稿会自动续写。</p>
          </div>
          <Link className="secondary-button" to="/records">
            查看记录列表
          </Link>
        </div>

        <form className="form-grid" onSubmit={handleStart}>
          <label className="field">
            <span>工人姓名</span>
            <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} required>
              <option value="">请选择工人</option>
              {config.workers.filter((item) => item.enabled).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>巡检日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label className="field">
            <span>班次</span>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
              <option value="">请选择班次</option>
              {config.baseOptions.shifts.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>生产线</span>
            <select value={lineId} onChange={(e) => setLineId(e.target.value)} required>
              <option value="">请选择生产线</option>
              {config.baseOptions.productionLines.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="field field-full">
            <span>巡检模板</span>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
              <option value="">请选择模板</option>
              {availableTemplates.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          {matchedDraft ? (
            <div className="inline-tip warning-tip">
              检测到一条相同条件的草稿，点击“开始填写”会直接进入上次未完成内容。
            </div>
          ) : null}

          {error ? <div className="inline-tip error-tip">{error}</div> : null}

          <div className="form-actions">
            <button className="primary-button" type="submit">开始填写</button>
            <Link className="secondary-button" to="/">返回首页</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRecordPage;
