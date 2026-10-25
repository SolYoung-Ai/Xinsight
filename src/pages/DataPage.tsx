import { useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileUp,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Notice } from '../components/ui/Notice';
import { EmptyState } from '../components/ui/State';
import { MappingForm } from '../components/MappingForm';
import { FieldMappingEditor } from '../components/FieldMappingEditor';
import { downloadText, buildOverviewCsv, buildPostsCsv } from '../services/export/report';
import type { FieldMapping, FileKind } from '../types';
import { fmtDate } from '../utils/date';
import uiStyles from '../styles/ui.module.css';

export function DataPage() {
  const {
    dataset,
    files,
    range,
    persist,
    setPersist,
    removeFile,
    applyMapping,
    beginImport,
    beginDemoImport,
    pending,
    commitImport,
    cancelImport,
    clearAll,
    notify,
  } = useData();
  const [editKind, setEditKind] = useState<FileKind | null>(null);
  const [draftMapping, setDraftMapping] = useState<FieldMapping | null>(null);
  const reimportRef = useRef<HTMLInputElement>(null);

  if (!dataset) {
    return (
      <EmptyState
        icon={<FileSpreadsheet size={22} />}
        title="暂无导入数据"
        desc="导入 Content / Overview CSV 或加载演示数据后，可在此管理文件、映射与本地保存。"
        action={
          <Button variant="primary" onClick={beginDemoImport}>
            加载模拟演示数据
          </Button>
        }
      />
    );
  }

  const openEdit = (kind: FileKind) => {
    if (!files[kind]) return;
    setEditKind(kind);
    setDraftMapping({ ...dataset.mapping[kind] });
  };

  const fileCard = (kind: FileKind) => {
    const file = files[kind];
    if (!file) return null;
    const info = kind === 'content' ? dataset.contentFile : dataset.overviewFile;
    const issues = info?.issues;
    const issueParts: string[] = [];
    if (issues) {
      if (issues.negativeCount > 0) issueParts.push(`负数 ${issues.negativeCount}`);
      if (issues.unparsedNumericCount > 0) issueParts.push(`格式异常 ${issues.unparsedNumericCount}`);
      if (issues.zeroImpressionsCount > 0) issueParts.push(`零曝光 ${issues.zeroImpressionsCount}`);
      if (issues.engagementsWithoutImpressionsCount > 0) issueParts.push(`有互动无曝光 ${issues.engagementsWithoutImpressionsCount}`);
    }
    return (
      <Card>
        <CardHeader
          title={
            <span className="row">
              <Badge tone={kind === 'content' ? 'accent' : 'info'}>
                {kind === 'content' ? 'Content CSV' : 'Overview CSV'}
              </Badge>
              {file.isDemo ? <Badge tone="warning">模拟数据</Badge> : null}
              <span className="small muted">{file.fileName}</span>
            </span>
          }
          right={
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Button size="sm" variant="ghost" onClick={() => openEdit(kind)}>
                <Pencil size={13} />
                调整映射
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  reimportRef.current?.click();
                }}
              >
                <RefreshCw size={13} />
                重新导入
              </Button>
              <Button size="sm" variant="danger" onClick={() => removeFile(kind)}>
                <Trash2 size={13} />
                移除
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-2 small">
            <div>
              解析记录：<strong className="num">{info?.parsedCount ?? 0}</strong> 条
              {info && (info.skippedCount > 0 || info.duplicateCount > 0)
                ? `（跳过 ${info.skippedCount}，重复 ${info.duplicateCount}）`
                : ''}
            </div>
            <div>
              日期范围：<strong>{info?.dateMin ?? '—'} ~ {info?.dateMax ?? '—'}</strong>
            </div>
            <div>
              导入时间：<span className="muted">{file.importedAt ? fmtDate(new Date(file.importedAt)) : '—'}</span>
            </div>
            <div className="muted">{issueParts.length > 0 ? issueParts.join(' · ') : '未发现明显数据问题'}</div>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            已映射字段：{Object.values(dataset.mapping[kind]).filter(Boolean).join('、') || '（无）'}。未映射字段显示为「指标不可用」，不会以 0 填充。
          </p>
        </CardBody>
      </Card>
    );
  };

  const reimportFor = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (f) await beginImport(f);
    };
    input.click();
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader title="数据管理 Data" desc="管理导入文件、字段映射、导出与本地保存" />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {fileCard('content') ?? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<FileSpreadsheet size={20} />}
                title="未导入 Content CSV"
                desc="单帖表现数据（曝光、互动、发帖分析）"
                action={
                  <Button variant="outline" size="sm" onClick={() => reimportFor()}>
                    <FileUp size={14} />
                    导入 Content CSV
                  </Button>
                }
              />
            </CardBody>
          </Card>
        )}
        {fileCard('overview') ?? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<FileSpreadsheet size={20} />}
                title="未导入 Overview CSV"
                desc="每日整体数据（净增粉丝、主页访问趋势）"
                action={
                  <Button variant="outline" size="sm" onClick={() => reimportFor()}>
                    <FileUp size={14} />
                    导入 Overview CSV
                  </Button>
                }
              />
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="下载当前分析结果" sub="导出内容仅包含当前所选范围、基于实际数据的计算结果" />
        <CardBody>
          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            <Button
              variant="outline"
              disabled={!range}
              onClick={() => {
                if (!range) return;
                downloadText('xai-posts.csv', buildPostsCsv(dataset, range), 'text/csv;charset=utf-8');
                notify('帖子分析数据 CSV 已导出');
              }}
            >
              <Download size={15} />
              导出帖子分析 CSV
            </Button>
            <Button
              variant="outline"
              disabled={!range}
              onClick={() => {
                if (!range) return;
                downloadText('xai-overview.csv', buildOverviewCsv(dataset, range), 'text/csv;charset=utf-8');
                notify('每日汇总 CSV 已导出');
              }}
            >
              <Download size={15} />
              导出每日汇总 CSV
            </Button>
            <span className="small muted">完整报告导出请前往「分析报告」模块。</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="浏览器本地保存（可选）"
          sub="默认关闭：刷新或关闭页面后，本次会话数据将被清除"
          right={
            <button
              className={[uiStyles.switch, persist ? uiStyles.switchOn : ''].join(' ')}
              onClick={() => setPersist(!persist)}
              role="switch"
              aria-checked={persist}
              aria-label="开启浏览器本地保存"
            >
              <span className={uiStyles.switchKnob} />
            </button>
          }
        />
        <CardBody>
          <p className="small" style={{ margin: 0, lineHeight: 1.7 }}>
            {persist
              ? '已开启：分析数据（含演示数据时一并标注）保存在当前浏览器 localStorage。数据只保存在当前浏览器，清除浏览器数据后可能无法恢复；清除本工具数据会一并删除。'
              : '未开启：数据仅保存在内存中。开启后，刷新页面可恢复上次分析结果。'}
          </p>
        </CardBody>
      </Card>

      <Notice tone="muted">
        <div style={{ display: 'flex', gap: 8 }}>
          <ShieldCheck size={15} style={{ flex: 'none', marginTop: 1 }} />
          <div className="small">
            隐私保证：所有计算在浏览器本地完成，不上传文件、不发送给外部 AI 或第三方平台，不使用追踪像素。
            本产品为独立第三方项目，与 X Corp. 无隶属关系，不代表 X 官方结论。用户数据不会写入 GitHub 仓库或构建产物。
          </div>
        </div>
      </Notice>

      <Card>
        <CardHeader title="危险操作" />
        <CardBody>
          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            <Button variant="danger" onClick={clearAll}>
              <Trash2 size={15} />
              清除所有数据
            </Button>
            <span className="small muted">将同时清理内存记录、图表缓存、临时变量与本地保存的数据。</span>
          </div>
        </CardBody>
      </Card>

      {/* 映射编辑弹窗（基于现有文件，无需重新上传） */}
      <Modal
        open={editKind !== null}
        title={`调整字段映射（${editKind === 'content' ? 'Content CSV' : 'Overview CSV'}）`}
        onClose={() => setEditKind(null)}
        wide
      >
        {editKind && dataset && draftMapping && files[editKind] ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="small muted" style={{ margin: 0 }}>
              调整后立即重新计算数据，无需重新上传文件。未映射的字段显示为「指标不可用」，不会以 0 填充。
            </p>
            <MappingForm
              kind={editKind}
              mapping={draftMapping}
              headers={files[editKind].parse.headers}
              onChange={setDraftMapping}
              autoMapping={undefined}
            />
            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setEditKind(null)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  applyMapping(editKind, draftMapping);
                  setEditKind(null);
                }}
              >
                应用映射
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 导入流程弹窗（重新导入） */}
      <Modal open={pending !== null} title="确认字段映射" onClose={cancelImport} wide>
        {pending ? <FieldMappingEditor pending={pending} onCommit={commitImport} onCancel={cancelImport} /> : null}
      </Modal>
    </div>
  );
}
