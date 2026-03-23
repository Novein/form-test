import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loadInspectionConfig } from '../../services/configService';
import { deleteRecord, getRecord, saveRecord } from '../../services/storageService';
import type { InspectionAnswer, InspectionConfig, InspectionRecord, TemplateItem } from '../../types/inspection';

type AnswerDraft = {
  value: string | number;
  remark: string;
};

const InspectionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const recordId = params.get('recordId') || '';

  const [config, setConfig] = useState<InspectionConfig | null>(null);
  const [record, setRecord] = useState<InspectionRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [overallRemark, setOverallRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const loadedConfig = await loadInspectionConfig();
        const loadedRecord = recordId ? await getRecord(recordId) : null;

        if (!mounted) {
          return;
        }

        if (recordId && !loadedRecord) {
          throw new Error('未找到要编辑的记录。');
        }

        setConfig(loadedConfig);
        setRecord(loadedRecord ?? null);
        if (loadedRecord) {
          setAnswers(toDraftAnswers(loadedRecord.answers));
          setOverallRemark(loadedRecord.overallRemark ?? '');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '页面加载失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [recordId]);

  const metadata = useMemo(() => {
    if (record) {
      return {
        workerId: record.workerId,
        date: record.inspectionDate,
        shiftId: record.shiftId,
        lineId: record.productionLineId,
        templateId: record.templateId,
      };
    }

    return {
      workerId: params.get('workerId') || '',
      date: params.get('date') || '',
      shiftId: params.get('shiftId') || '',
      lineId: params.get('lineId') || '',
      templateId: params.get('templateId') || '',
    };
  }, [params, record]);

  const template = useMemo(() => {
    if (!config || !metadata.templateId) {
      return null;
    }
    return config.templates.find((item) => item.id === metadata.templateId) ?? null;
  }, [config, metadata.templateId]);

  const worker = useMemo(
    () => config?.workers.find((item) => item.id === metadata.workerId) ?? null,
    [config, metadata.workerId]
  );
  const shift = useMemo(
    () => config?.baseOptions.shifts.find((item) => item.id === metadata.shiftId) ?? null,
    [config, metadata.shiftId]
  );
  const line = useMemo(
    () => config?.baseOptions.productionLines.find((item) => item.id === metadata.lineId) ?? null,
    [config, metadata.lineId]
  );

  useEffect(() => {
    if (!config || !template || !config.appInfo.enableDraftAutoSave) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistRecord('draft', false);
    }, config.appInfo.autoSaveIntervalMs);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [answers, overallRemark, config, template, metadata.workerId, metadata.date, metadata.shiftId, metadata.lineId]);

  const persistRecord = async (status: 'draft' | 'submitted', showToast = true) => {
    if (!config || !template || !worker || !shift || !line) {
      return null;
    }

    const now = new Date().toISOString();
    const nextRecordId =
      status === 'draft'
        ? record?.status === 'draft' && record.id ? record.id : `draft_${metadata.workerId}_${metadata.date}_${metadata.shiftId}_${metadata.lineId}_${metadata.templateId}`
        : record?.status === 'submitted' && record.id ? record.id : `record_${metadata.workerId}_${metadata.date}_${metadata.shiftId}_${metadata.lineId}_${metadata.templateId}`;

    const nextRecord: InspectionRecord = {
      id: nextRecordId,
      templateId: template.id,
      templateName: template.name,
      workerId: worker.id,
      workerName: worker.name,
      employeeNo: worker.employeeNo,
      shiftId: shift.id,
      shiftName: shift.label,
      productionLineId: line.id,
      productionLineName: line.label,
      inspectionDate: metadata.date,
      status,
      answers: buildAnswers(template.sections.flatMap((section) => section.items), answers),
      overallRemark,
      createdAt: record?.createdAt ?? now,
      updatedAt: now,
      submittedAt: status === 'submitted' ? now : record?.submittedAt,
      exported: record?.exported ?? false,
      exportedAt: record?.exportedAt ?? null,
    };

    await saveRecord(nextRecord);
    if (record?.id && record.id !== nextRecord.id) {
      await deleteRecord(record.id);
    }
    setRecord(nextRecord);
    if (showToast) {
      setMessage(status === 'draft' ? '草稿已保存。' : '记录已提交。');
    }
    return nextRecord;
  };

  const handleChange = (item: TemplateItem, value: string | number) => {
    setAnswers((current) => ({
      ...current,
      [item.id]: {
        value,
        remark: current[item.id]?.remark ?? '',
      },
    }));
    setMessage('');
  };

  const handleRemarkChange = (itemId: string, remark: string) => {
    setAnswers((current) => ({
      ...current,
      [itemId]: {
        value: current[itemId]?.value ?? '',
        remark,
      },
    }));
    setMessage('');
  };

  const handleSaveDraft = async () => {
    await persistRecord('draft');
  };

  const handleSubmit = async () => {
    if (!template) {
      return;
    }

    const validationError = validateForm(template.sections.flatMap((section) => section.items), answers);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.confirm('确认提交本次巡检记录吗？提交后仍可在记录页继续编辑。')) {
      return;
    }

    setError('');
    const savedRecord = await persistRecord('submitted');
    if (savedRecord) {
      navigate(`/records/${savedRecord.id}`);
    }
  };

  if (loading) {
    return <div className="page-shell"><div className="page-card">加载中...</div></div>;
  }

  if (error && (!config || !template)) {
    return <div className="page-shell"><div className="page-card empty-state">{error}</div></div>;
  }

  if (!config || !template || !worker || !shift || !line || !metadata.date) {
    return (
      <div className="page-shell">
        <div className="page-card empty-state">
          巡检参数不完整，请先从新建记录页进入。
          <Link className="secondary-button" to="/new">返回新建记录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Inspection Form</div>
            <h1>{template.name}</h1>
            <p className="page-subtitle">
              {worker.name} · {metadata.date} · {shift.label} · {line.label}
            </p>
          </div>
          <div className="header-actions">
            <button className="secondary-button" onClick={handleSaveDraft}>暂存草稿</button>
            <Link className="secondary-button" to="/records">记录列表</Link>
          </div>
        </div>

        {error ? <div className="inline-tip error-tip">{error}</div> : null}
        {message ? <div className="inline-tip success-tip">{message}</div> : null}

        {template.sections.map((section) => (
          <section key={section.id} className="section-card">
            <div className="section-header">
              <div>
                <h2>{section.title}</h2>
                {section.description ? <p>{section.description}</p> : null}
              </div>
            </div>

            <div className="field-stack">
              {section.items.map((item) => {
                const current = answers[item.id];
                const selectedAbnormal =
                  item.remarkRequiredWhen?.operator === 'equals' &&
                  current?.value === item.remarkRequiredWhen.value;

                return (
                  <label key={item.id} className="field field-full">
                    <span>
                      {item.label}
                      {item.required ? <em>*</em> : null}
                    </span>

                    {item.type === 'radio' ? (
                      <div className="radio-group">
                        {(config.resultOptionSets[item.optionSetId ?? ''] ?? []).map((option) => (
                          <button
                            type="button"
                            key={option.value}
                            className={current?.value === option.value ? 'radio-pill active' : 'radio-pill'}
                            onClick={() => handleChange(item, option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {item.type === 'number' ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        min={item.min}
                        max={item.max}
                        value={current?.value ?? ''}
                        placeholder={item.placeholder ?? '请输入数值'}
                        onChange={(e) => handleChange(item, e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    ) : null}

                    {item.type === 'text' ? (
                      <input
                        type="text"
                        value={current?.value ?? ''}
                        placeholder={item.placeholder ?? '请输入内容'}
                        onChange={(e) => handleChange(item, e.target.value)}
                      />
                    ) : null}

                    {item.type === 'textarea' ? (
                      <textarea
                        rows={4}
                        value={current?.value ?? ''}
                        placeholder={item.placeholder ?? '请输入说明'}
                        onChange={(e) => handleChange(item, e.target.value)}
                      />
                    ) : null}

                    {item.unit ? <small className="field-hint">单位：{item.unit}</small> : null}

                    {(item.allowRemark || selectedAbnormal) ? (
                      <textarea
                        rows={3}
                        value={current?.remark ?? ''}
                        placeholder={selectedAbnormal ? '当前结果为异常，请填写备注' : '可选备注'}
                        onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                      />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2>补充说明</h2>
            </div>
          </div>
          <textarea
            rows={4}
            value={overallRemark}
            placeholder="填写本次巡检的补充说明、交接事项或异常汇总"
            onChange={(e) => setOverallRemark(e.target.value)}
          />
        </section>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={handleSubmit}>提交记录</button>
          <button className="secondary-button" type="button" onClick={handleSaveDraft}>保存草稿</button>
        </div>
      </div>
    </div>
  );
};

function validateForm(items: TemplateItem[], answers: Record<string, AnswerDraft>) {
  for (const item of items) {
    const answer = answers[item.id];
    const value = answer?.value;

    if (item.required && (value === undefined || value === '')) {
      return `请填写必填项：${item.label}`;
    }

    if (item.type === 'number' && value !== undefined && value !== '') {
      if (typeof value !== 'number') {
        return `${item.label} 必须为数值`;
      }
      if (item.min !== undefined && value < item.min) {
        return `${item.label} 不能小于 ${item.min}`;
      }
      if (item.max !== undefined && value > item.max) {
        return `${item.label} 不能大于 ${item.max}`;
      }
    }

    if (
      item.remarkRequiredWhen?.operator === 'equals' &&
      value === item.remarkRequiredWhen.value &&
      !answer?.remark?.trim()
    ) {
      return `${item.label} 当前结果需要填写备注`;
    }
  }

  return '';
}

function buildAnswers(items: TemplateItem[], answers: Record<string, AnswerDraft>) {
  return items.reduce<Record<string, InspectionAnswer>>((result, item) => {
    const current = answers[item.id];
    const abnormal =
      item.remarkRequiredWhen?.operator === 'equals' &&
      current?.value === item.remarkRequiredWhen.value;

    result[item.id] = {
      value: current?.value ?? '',
      remark: current?.remark ?? '',
      filled: current?.value !== undefined && current?.value !== '',
      abnormal: Boolean(abnormal),
      updatedAt: new Date().toISOString(),
    };
    return result;
  }, {});
}

function toDraftAnswers(answers: InspectionRecord['answers']) {
  return Object.entries(answers).reduce<Record<string, AnswerDraft>>((result, [key, value]) => {
    result[key] = {
      value: value.value ?? '',
      remark: value.remark ?? '',
    };
    return result;
  }, {});
}

export default InspectionFormPage;
