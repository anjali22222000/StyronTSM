import { useState, useEffect, useCallback } from "react";
import { Mail, Save, Loader2, Code2, Eye, Eye as EyeIcon } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { cn } from "../../utils";
import toast from "react-hot-toast";

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/email-templates/admin/list");
      setTemplates(res.data);
      if (res.data.length && !activeKey) {
        setActiveKey(res.data[0].key);
        setSubject(res.data[0].subject);
        setHtmlBody(res.data[0].html_body);
      }
    } catch (err) {
      toast.error(err.message || "Couldn't load templates.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const selectTemplate = (t) => {
    setActiveKey(t.key);
    setSubject(t.subject);
    setHtmlBody(t.html_body);
    setPreviewMode(false);
  };

  const activeTemplate = templates.find((t) => t.key === activeKey);

  const save = async () => {
    setSaving(true);
    try {
      await adminApiFetch(`/email-templates/admin/${activeKey}`, {
        method: "PUT",
        body: JSON.stringify({ subject, html_body: htmlBody }),
      });
      toast.success("Template saved.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't save template.");
    } finally {
      setSaving(false);
    }
  };

  const renderedPreview = () => {
    let preview = htmlBody;
    try {
      const vars = JSON.parse(activeTemplate?.variables || "[]");
      vars.forEach((v) => {
        preview = preview.replaceAll(`{{${v}}}`, `<span style="background:#fed7aa;padding:1px 4px;border-radius:3px;">${v}</span>`);
      });
    } catch {
      // ignore
    }
    return preview;
  };

  if (loading) {
    return <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-navy-950 tracking-tight flex items-center gap-2">
          <Mail size={20} className="text-orange-500" /> Email Templates
        </h1>
        <p className="text-steel-500 text-sm">Edit transactional email content — no code changes needed.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1 card p-2 h-fit">
          {templates.map((t) => (
            <button key={t.key} onClick={() => selectTemplate(t)}
              className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors",
                activeKey === t.key ? "bg-navy-950 text-white" : "text-steel-600 hover:bg-steel-50")}>
              {t.name}
            </button>
          ))}
        </div>

        {activeTemplate && (
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-5">
              <label className="text-xs font-semibold text-steel-500 mb-1.5 block">Subject Line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="form-input w-full" />
              <p className="text-xs text-steel-400 mt-2">
                Available variables: {(() => { try { return JSON.parse(activeTemplate.variables || "[]").map((v) => `{{${v}}}`).join(", "); } catch { return ""; } })()}
              </p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-steel-500 flex items-center gap-1.5">
                  <Code2 size={13} /> HTML Body
                </label>
                <button onClick={() => setPreviewMode((p) => !p)} className="text-xs flex items-center gap-1 text-orange-500 font-semibold">
                  <EyeIcon size={13} /> {previewMode ? "Edit HTML" : "Preview"}
                </button>
              </div>
              {previewMode ? (
                <div className="border border-steel-200 rounded-xl p-4 min-h-[300px] bg-steel-50" dangerouslySetInnerHTML={{ __html: renderedPreview() }} />
              ) : (
                <textarea value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={16}
                  className="form-input w-full font-mono text-xs leading-relaxed" />
              )}
            </div>

            <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-6 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
