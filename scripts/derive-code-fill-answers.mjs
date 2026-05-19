/**
 * 根据 ipynb 空位上下文推导标准答案（PDF 匹配失败时的兜底）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BLANK_RE = /_{5,}/g;

const QUESTION_IDS = [
  "1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5",
  "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
  "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5",
];

function listCsv(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
}

function deriveLine(line, ctx) {
  const blanks = (line.match(BLANK_RE) || []).length;
  if (blanks === 0) return [];

  if (/^data\s*=\s*$/.test(line.replace(BLANK_RE, "").trim()) || /^data\s*=\s*_{5,}\s*$/.test(line)) {
    const csv = ctx.csv[0];
    return [`pd.read_csv('${csv}')`];
  }

  if (line.includes("'高风险患者'") && line.includes("np.where")) {
    return ["data['RiskLevel']", "np.where", "data['DaysInHospital'] > 7"];
  }
  if (line.includes("risk_counts = data") && line.includes("value_counts")) {
    return ["['RiskLevel']", ".value_counts()"];
  }
  if (line.includes("high_risk_ratio") || line.includes("low_risk_ratio")) {
    return ["len(data)"];
  }
  if (line.includes("BMIRange") && line.includes("bmi_bins")) {
    return ["pd.cut", "data['BMI']", "bins=bmi_bins, labels=bmi_labels"];
  }
  if (line.includes("bmi_risk_rate") && line.includes("groupby")) {
    return ["data.groupby", "('BMIRange')"];
  }
  if (line.includes("bmi_patient_count")) {
    return ["['BMIRange'].value_counts()"];
  }
  if (line.includes("AgeRange") && line.includes("age_bins")) {
    return ["pd.cut", "data['Age']", "bins=age_bins, labels=age_labels"];
  }
  if (line.includes("age_risk_rate") && line.includes("groupby")) {
    return ["data.groupby", "('AgeRange')"];
  }
  if (line.includes("age_patient_count")) {
    return ["['AgeRange'].value_counts()"];
  }

  if (line.includes("read_csv") && blanks === 1) {
    return [`pd.read_csv('${ctx.csv[0]}')`];
  }
  if (line.includes("groupby('SensorType')") && line.includes("agg")) {
    return ["data.groupby('SensorType')"];
  }
  if (line.includes("groupby(['Location'") && blanks >= 1) {
    return ["data[data['SensorType'].isin(['Temperature', 'Humidity'])].groupby(['Location', 'SensorType'])['Value'].mean().unstack()"];
  }
  if (line.includes("is_abnormal") && line.includes("np.where")) {
    return [
      "np.where(",
      "((data['SensorType'] == 'Temperature') & ((data['Value'] < -10) | (data['Value'] > 50))) |",
      "((data['SensorType'] == 'Humidity') & ((data['Value'] < 0) | (data['Value'] > 100))),",
      "True, False",
    ].slice(0, blanks);
  }
  if (line.includes("fillna(method='ffill'")) return ["data['Value'].fillna(method='ffill', inplace=True)"];
  if (line.includes("fillna(method='bfill'")) return ["data['Value'].fillna(method='bfill', inplace=True)"];
  if (line.includes("drop(columns") && line.includes("to_csv")) {
    return ["data.drop(columns=['is_abnormal'])", "cleaned_data.to_csv('cleaned_sensor_data.csv', index=False)"].slice(0, blanks);
  }

  if (line.includes("onnxruntime") || line.includes("InferenceSession")) {
    return ["ort.InferenceSession('resnet.onnx')"];
  }
  if (line.includes("Image.open") || line.includes("open(") && line.includes("RGB")) {
    return ["Image.open('img_test.jpg').convert('RGB')"];
  }
  if (line.includes("preprocess_image")) {
    return ["preprocess_image(image)"];
  }
  if (line.includes("session.run")) {
    return ["session.run"];
  }

  return Array(blanks).fill("");
}

function deriveQuestion(qid) {
  const dir = path.join(root, "PythonCode", `${qid}-素材`);
  const ipynb = JSON.parse(fs.readFileSync(path.join(dir, `${qid}.ipynb`), "utf8"));
  const ctx = { csv: listCsv(dir), qid };
  const answers = [];
  for (const cell of ipynb.cells) {
    if (cell.cell_type !== "code") continue;
    const src = cell.source.join("");
    for (const line of src.split("\n")) {
      if (!BLANK_RE.test(line)) continue;
      BLANK_RE.lastIndex = 0;
      answers.push(...deriveLine(line, ctx));
    }
  }
  return answers;
}

const out = {};
for (const qid of QUESTION_IDS) {
  out[qid] = deriveQuestion(qid);
}
const outPath = path.join(__dirname, "code-fill-answer-overrides.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("wrote", outPath);
