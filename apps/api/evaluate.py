"""Repeatable local baseline check. Curated synthetic labels are not a field accuracy estimate."""
import json
from pathlib import Path

from app.analysis import rules_assessment
from app.schemas import AnalyzeRequest


def main():
    cases = json.loads((Path(__file__).parent / "demo/scenarios.json").read_text(encoding="utf-8"))
    rows = []
    for case in cases:
        request = AnalyzeRequest(conversation_id=case["id"], session_id="evaluation", revision=1,
                                 messages=[dict(m, id=f"{case['id']}:{i}") for i, m in enumerate(case["messages"])])
        result = rules_assessment(request)
        rows.append(dict(id=case["id"], expected=case["expected"], actual=result.level,
                         agrees=result.level == case["expected"], evidence_ids=[s.evidence_ids for s in result.signals]))
    report = {"provider": "rules", "synthetic": True, "note": "Author-written demo labels; not an estimate of real-world accuracy.",
              "cases": rows, "agreement_count": sum(r["agrees"] for r in rows), "total": len(rows)}
    destination = Path(__file__).parents[1].parent / "outputs/baseline-evaluation.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Synthetic label agreement: {report['agreement_count']}/{len(rows)}. Report: {destination}")


if __name__ == "__main__":
    main()
