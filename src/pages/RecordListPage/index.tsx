import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { deleteRecord, getAllRecords } from '../../services/storageService';
import type { InspectionConfig, InspectionRecord } from '../../types/inspection';

const RecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted'>('all');
  const [workerId, setWorkerId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [lineId, setLineId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [date, setDate] = useState('');
  const [exportedFilter, setExportedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const loadPage = async () => {
    setLoading(true);
    try {
      const [loadedConfig, loadedRecords] = await Promise.all([
        loadInspectionConfig(),
        getAllRecords(),
      ]);
      setConfig(loadedConfig);
      setRecords(loadedRecords.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }
      if (workerId && record.workerId !== workerId) {
        return false;
      }
      if (shiftId && record.shiftId !== shiftId) {
        return false;
      }
      if (lineId && record.productionLineId !== lineId) {
        return false;
      }
      if (templateId && record.templateId !== templateId) {
        return false;
      }
      if (date && record.inspectionDate !== date) {
        return false;
      }
      if (exportedFilter === 'yes' && !record.exported) {
        return false;
      }
      if (exportedFilter === 'no' && record.exported) {
        return false;
      }
      return true;
    });
  }, [records, statusFilter, workerId, shiftId, lineId, templateId, date, exportedFilter]);

  const exportableIds = filteredRecords
    .filter((item) => item.status === 'submitted')
    .map((item) => item.id);

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('确定删除这条记录吗？')) {
      return;
    }

    await deleteRecord(recordId);
    setSelected((current) => current.filter((item) => item !== recordId));
    await loadPage();
  };

  const handleToggle = (recordId: string, enabled: boolean) => {
    setSelected((current) =>
      enabled ? [...new Set([...current, recordId])] : current.filter((item) => item !== recordId)
    );
  };

  const handleSelectAll = (enabled: boolean) => {
    setSelected(enabled ? exportableIds : []);
  };

  if (error && !config) {
    return <div className="page-shell"><div className="page-card empty-state">{error}</div></div>;
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Records</div>
            <h1>巡检记录列表</h1>
            <p className="page-subtitle">支持按状态、工人、班次、产线和日期筛选，并对已提交记录批量导出。</p>
          </div>
          <div className="header-actions">
            <Link className="secondary-button" to="/new">新建记录</Link>
            <button
              className="primary-button"
              disabled={selected.length === 0}
              onClick={() => navigate(`/export?ids=${selected.join(',')}`)}
            >
              批量导出预览
            </button>
          </div>
        </div>

        <div className="filter-grid">
          <label className="field">
            <span>状态</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">全部</option>
              <option value="draft">草稿</option>
              <option value="submitted">已提交</option>
            </select>
          </label>
          <label className="field">
            <span>日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>导出状态</span>
            <select value={exportedFilter} onChange={(e) => setExportedFilter(e.target.value as typeof exportedFilter)}>
              <option value="all">全部</option>
              <option value="no">未导出</option>
              <option value="yes">已导出</option>
            </select>
          </label>
          {config ? (
            <>
              <label className="field">
                <span>工人</span>
                <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
                  <option value="">全部</option>
                  {config.workers.filter((item) => item.enabled).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>班次</span>
                <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                  <option value="">全部</option>
                  {config.baseOptions.shifts.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>产线</span>
                <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
                  <option value="">全部</option>
                  {config.baseOptions.productionLines.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>模板</span>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  <option value="">全部</option>
                  {config.templates.filter((item) => item.enabled).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>

        <div className="toolbar-row">
          <label className="table-checkbox">
            <input
              type="checkbox"
              checked={exportableIds.length > 0 && selected.length === exportableIds.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span>全选当前可导出的已提交记录</span>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setStatusFilter('all');
              setWorkerId('');
              setShiftId('');
              setLineId('');
              setTemplateId('');
              setDate('');
              setExportedFilter('all');
              setSelected([]);
            }}
          >
            重置筛选
          </button>
        </div>

        {loading ? (
          <div>加载中...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">当前筛选条件下暂无记录。</div>
        ) : (
          <div className="table-shell">
            <table className="record-table">
              <thead>
                <tr>
                  <th>选择</th>
                  <th>工人</th>
                  <th>日期</th>
                  <th>班次</th>
                  <th>产线</th>
                  <th>模板</th>
                  <th>状态</th>
                  <th>导出</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const selectable = record.status === 'submitted';
                  return (
                    <tr key={record.id}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!selectable}
                          checked={selected.includes(record.id)}
                          onChange={(e) => handleToggle(record.id, e.target.checked)}
                        />
                      </td>
                      <td>{record.workerName}</td>
                      <td>{record.inspectionDate}</td>
                      <td>{record.shiftName}</td>
                      <td>{record.productionLineName}</td>
                      <td>{record.templateName}</td>
                      <td>
                        <span className={record.status === 'submitted' ? 'status-badge status-ok' : 'status-badge'}>
                          {record.status === 'draft' ? '草稿' : '已提交'}
                        </span>
                      </td>
                      <td>{record.exported ? '已导出' : '未导出'}</td>
                      <td>{formatTime(record.updatedAt)}</td>
                      <td className="table-actions">
                        <button className="text-button" onClick={() => navigate(`/records/${record.id}`)}>查看</button>
                        <button className="text-button" onClick={() => navigate(`/form?recordId=${record.id}`)}>
                          {record.status === 'draft' ? '继续' : '编辑'}
                        </button>
                        <button className="text-button danger-text" onClick={() => void handleDelete(record.id)}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(value: string) {
  return value.replace('T', ' ').slice(0, 16);
}

export default RecordListPage;
