import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { deleteRecord, getRecord } from '../../services/storageService';
import type { InspectionConfig, InspectionRecord } from '../../types/inspection';

const RecordDetailPage: React.FC = () => {
  const { recordId = '' } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([getRecord(recordId), loadInspectionConfig()])
      .then(([loadedRecord, loadedConfig]) => {
        if (!mounted) {
          return;
        }

        if (!loadedRecord) {
          setError('未找到对应记录。');
          return;
        }

        setRecord(loadedRecord);
        setConfig(loadedConfig);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : '记录加载失败');
        }
      });

    return () => {
      mounted = false;
    };
  }, [recordId]);

  const template = useMemo(() => {
    if (!config || !record) {
      return null;
    }

    return config.templates.find((item) => item.id === record.templateId) ?? null;
  }, [config, record]);

  const handleDelete = async () => {
    if (!record || !window.confirm(`确定删除 ${record.workerName} 的这条记录吗？`)) {
      return;
    }

    await deleteRecord(record.id);
    navigate('/records');
  };

  if (error) {
    return (
      <div className="page-shell">
        <div className="page-card empty-state">
          <h2>记录详情</h2>
          <p>{error}</p>
          <Link className="secondary-button" to="/records">
            返回记录列表
          </Link>
        </div>
      </div>
    );
  }

  if (!record || !config || !template) {
    return <div className="page-shell"><div className="page-card">加载中...</div></div>;
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">记录详情</div>
            <h1>{record.templateName}</h1>
            <p className="page-subtitle">
              {record.workerName} · {record.inspectionDate} · {record.shiftName} · {record.productionLineName}
            </p>
          </div>
          <div className="header-actions">
            <Link className="secondary-button" to={`/form?recordId=${record.id}`}>
              {record.status === 'draft' ? '继续填写' : '编辑记录'}
            </Link>
            <button className="ghost-danger-button" onClick={handleDelete}>
              删除记录
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item"><span>记录状态</span><strong>{record.status === 'draft' ? '草稿' : '已提交'}</strong></div>
          <div className="detail-item"><span>工号</span><strong>{record.employeeNo}</strong></div>
          <div className="detail-item"><span>更新时间</span><strong>{formatTime(record.updatedAt)}</strong></div>
          <div className="detail-item"><span>导出状态</span><strong>{record.exported ? '已导出' : '未导出'}</strong></div>
        </div>

        {template.sections.map((section) => (
          <section key={section.id} className="section-card">
            <div className="section-header">
              <div>
                <h2>{section.title}</h2>
                {section.description ? <p>{section.description}</p> : null}
              </div>
            </div>
            <div className="detail-answer-list">
              {section.items.map((item) => {
                const answer = record.answers[item.id];
                const displayValue = getDisplayValue(item.optionSetId, answer?.value, config);
                return (
                  <div key={item.id} className="detail-answer-row">
                    <div>
                      <strong>{item.label}</strong>
                      {item.unit && answer?.value !== '' ? <span className="muted-inline"> {item.unit}</span> : null}
                    </div>
                    <div className={answer?.abnormal ? 'status-badge status-abnormal' : 'status-badge'}>
                      {displayValue || '未填写'}
                    </div>
                    {answer?.remark ? <p className="answer-remark">备注：{answer.remark}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

function getDisplayValue(optionSetId: string | undefined, value: string | number | null | undefined, config: InspectionConfig) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  if (optionSetId) {
    return config.resultOptionSets[optionSetId]?.find((item) => item.value === value)?.label ?? String(value);
  }

  return String(value);
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export default RecordDetailPage;
