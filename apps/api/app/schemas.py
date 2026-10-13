from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=200)
    sender: Literal["self", "other", "unknown"]
    text: str = Field(min_length=1, max_length=4000)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    conversation_id: str = Field(min_length=1, max_length=200)
    session_id: str = Field(min_length=1, max_length=100)
    revision: int = Field(ge=1)
    history_limit: Literal[100, 300] = 100
    messages: list[Message] = Field(min_length=1, max_length=300)
    provider: Literal["rules", "groq"] = "rules"
    external_consent: bool = False

    @model_validator(mode="after")
    def check_context(self):
        if len({m.id for m in self.messages}) != len(self.messages):
            raise ValueError("Duplicate message IDs")
        if len(self.messages) > self.history_limit or sum(len(m.text) for m in self.messages) > self.history_limit * 240:
            raise ValueError("Context exceeds selected history budget")
        return self


class Signal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    evidence_ids: list[str] = Field(min_length=1, max_length=8)


class Assessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    level: Literal["no_signal", "review", "high_concern", "insufficient_context"]
    summary: str = Field(min_length=1, max_length=1200)
    signals: list[Signal] = Field(max_length=12)
    actions: list[str] = Field(max_length=6)
    limitations: list[str] = Field(max_length=6)


class AnalyzeResponse(Assessment):
    conversation_id: str
    session_id: str
    revision: int
    provider: Literal["rules", "groq"]
    analyzed_count: int
