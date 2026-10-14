"""Small, derived claim ledger. No persistence, inferred facts or cross-chat memory."""
import re
import unicodedata
from dataclasses import dataclass

from .schemas import Message, Signal


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).split())


@dataclass(frozen=True)
class FeeClaim:
    source_message_id: str
    position: int
    value: str  # no_fee or requested_fee; not a truth judgement


def fee_claims(messages: list[Message]) -> list[FeeClaim]:
    claims = []
    for position, message in enumerate(messages):
        if message.sender != "other":
            continue
        text = normalize(message.text)
        # This baseline only handles direct statements, not quotation or exceptions.
        if re.search(r"\b(vi du|trich dan|nguoi ta noi|ho noi|neu|nhung|ngoai tru)\b", text):
            continue
        if text.endswith("?") or re.search(r"\b(dung|khong nen|tuyet doi khong)\s+(dong|nop|tra|chuyen|gui|giao|dua)\b", text):
            continue
        no_fee = re.search(r"\b(khong (thu|mat|ton)|mien) (bat ky )?(khoan )?phi\b", text)
        no_fee = no_fee or re.search(r"\bkhong (can|phai) (dong|nop|tra|chuyen) (bat ky )?(khoan )?(phi|tien)\b", text)
        if no_fee:
            claims.append(FeeClaim(message.id, position, "no_fee"))
        elif not re.search(r"\bkhong\b", text) and re.search(
            r"\b(dong|nop|tra|chuyen khoan|ck|nap)\b.{0,45}\b(phi|tien|coc|\d+[kmd])\b", text
        ):
            claims.append(FeeClaim(message.id, position, "requested_fee"))
    return claims


def fee_change_signal(messages: list[Message]) -> Signal | None:
    promise = None
    pair = None
    for claim in fee_claims(messages):
        if claim.value == "no_fee":
            promise = claim
        elif promise:
            pair = (promise.source_message_id, claim.source_message_id)
    if not pair:
        return None
    return Signal(kind="changed_fee_condition", title="Trước nói không thu phí, sau yêu cầu tiền: cần đối chiếu điều kiện", evidence_ids=list(pair))
