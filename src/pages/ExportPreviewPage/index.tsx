import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { getAllRecords, markRecordsExported } from '../../services/storageService';
import type { InspectionConfig, InspectionRecord, TemplateItem } from '../../types/inspection';

const ExportPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const idsParam = params.get('ids') || '';
  const ids = useMemo(() => idsParam.split(',').filter(Boolean), [idsParam]);

  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const [allRecords, loadedConfig] = await Promise.all([
          getAllRecords(),
          loadInspectionConfig(),
        ]);

        if (!mounted) {
          return;
        }

        const nextRecords = (ids.length > 0 ? allRecords.filter((item) => ids.includes(item.id)) : allRecords.filter((item) => item.status === 'submitted'))
          .filter((item) => item.status === 'submitted');

        setRecords(nextRecords);
        setConfig(loadedConfig);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '导出预览加载失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [idsParam, ids.length]);

  const allItems = useMemo(() => {
    if (!config || records.length === 0) {
      return [] as TemplateItem[];
    }

    const merged = records.flatMap((record) => {
      const template = config.templates.find((item) => item.id === record.templateId);
      return template ? template.sections.flatMap((section) => section.items) : [];
    });

    return merged.filter((item, index) => merged.findIndex((candidate) => candidate.id === item.id) === index);
  }, [config, records]);

  const abnormalCount = useMemo(() => {
    return records.reduce((sum, record) => {
      return sum + Object.values(record.answers).filter((item) => item.abnormal).length;
    }, 0);
  }, [records]);

  const handleExport = async () => {
    if (records.length === 0) {
      return;
    }

    await markRecordsExported(records.map((item) => item.id));
    window.print();
    navigate('/records');
  };

  if (error && !config) {
    return <div className="page-shell"><div className="page-card empty-state">{error}</div></div>;
  }

  return (
    <div className="page-shell export-page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Export Preview</div>
            <h1>{config?.pdfConfig.title ?? '巡检汇总导出预览'}</h1>
            <p className="page-subtitle">先确认记录范围和异常项，再使用浏览器打印为 PDF。</p>
          </div>
          <div className="header-actions no-print">
            <Link className="secondary-button" to="/records">返回列表</Link>
            <button className="primary-button" onClick={() => void handleExport()} disabled={records.length === 0}>
              打印 / 保存为 PDF
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item"><span>记录数量</span><strong>{records.length}</strong></div>
          <div className="detail-item"><span>异常项</span><strong>{abnormalCount}</strong></div>
          <div className="detail-item"><span>导出时间</span><strong>{new Date().toLocaleString()}</strong></div>
          <div className="detail-item"><span>导出方式</span><strong>浏览器打印为 PDF</strong></div>
        </div>

        {loading ? (
          <div>加载中...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            当前没有可导出的已提交记录。
            <Link className="secondary-button" to="/records">去记录列表选择</Link>
          </div>
        ) : (
          <>
            <section className="section-card no-print">
              <div className="section-header">
                <div>
                  <h2>导出记录</h2>
                  <p>可在这里移除误选记录。</p>
                </div>
              </div>
              <div className="template-list">
                {records.map((record) => (
                  <div key={record.id} className="template-item">
                    <div>
                      <strong>{record.workerName}</strong>
                      <p>{record.inspectionDate} · {record.shiftName} · {record.productionLineName}</p>
                    </div>
                    <button
                      className="text-button danger-text"
                      onClick={() => setRecords((current) => current.filter((item) => item.id !== record.id))}
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="table-shell">
              <table className="record-table compact-table">
                <thead>
                  <tr>
                    <th>工人</th>
                    <th>日期</th>
                    <th>班次</th>
                    <th>产线</th>
                    <th>模板</th>
                    {allItems.map((item) => (
                      <th key={item.id}>{item.label}</th>
                    ))}
                    <th>补充说明</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.workerName}</td>
                      <td>{record.inspectionDate}</td>
                      <td>{record.shiftName}</td>
                      <td>{record.productionLineName}</td>
                      <td>{record.templateName}</td>
                      {allItems.map((item) => {
                        const answer = record.answers[item.id];
                        const displayValue = formatAnswer(item, answer?.value, config);
                        return (
                          <td key={item.id} className={answer?.abnormal ? 'abnormal-cell' : ''}>
                            {displayValue || '-'}
                            {answer?.remark ? <div className="table-remark">{answer.remark}</div> : null}
                          </td>
                        );
                      })}
                      <td>{record.overallRemark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function formatAnswer(item: TemplateItem, value: string | number | null | undefined, config: InspectionConfig | null) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (item.optionSetId && config) {
    const label = config.resultOptionSets[item.optionSetId]?.find((option) => option.value === value)?.label;
    return label ?? String(value);
  }

  if (item.type === 'number' && item.unit) {
    return `${value} ${item.unit}`;
  }

  return String(value);
}

export default ExportPreviewPage;
