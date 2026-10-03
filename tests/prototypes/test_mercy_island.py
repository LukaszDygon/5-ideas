"""Mercy Island gamebook: the adventure file is consistent, fair to every investigator, and plays 20-30 sections."""

import random
import statistics
from pathlib import Path

import pytest
import yaml

ADVENTURES = Path(__file__).resolve().parents[2] / "prototypes" / "mercy-island" / "static" / "adventures"
CHARACTERISTICS = {"STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"}
UNIVERSAL = CHARACTERISTICS | {"Luck", "Dodge"}
TRAINED = 40  # a skill at this value or above counts as trained


@pytest.fixture(scope="module")
def adv():
    return yaml.safe_load((ADVENTURES / "mercy-island.yaml").read_text(encoding="utf-8"))


def sections(adv):
    return {str(k): v for k, v in adv["sections"].items()}


def choices(adv):
    for sid, sec in sections(adv).items():
        for choice in sec.get("choices") or []:
            yield sid, choice


def targets(choice):
    if "roll" in choice:
        return [str(choice["roll"][k]) for k in ("success", "failure", "fumble") if k in choice["roll"]]
    return [str(choice["to"])]


def leaves(req):
    """Flatten a requires block into its single conditions."""
    if not req:
        return []
    if isinstance(req, list):
        return [leaf for r in req for leaf in leaves(r)]
    if "any" in req:
        return [leaf for r in req["any"] for leaf in leaves(r)]
    return [req]


def all_effects(adv):
    for sec in sections(adv).values():
        yield from sec.get("effects") or []
        for choice in sec.get("choices") or []:
            yield from choice.get("effects") or []


def all_conditions(adv):
    for sec in sections(adv).values():
        for extra in sec.get("extra") or []:
            yield from leaves(extra.get("requires"))
        for choice in sec.get("choices") or []:
            yield from leaves(choice.get("requires"))


def rolled_skills(choice):
    skill = choice["roll"]["skill"]
    return skill if isinstance(skill, list) else [skill]


def test_adventure_has_no_duplicate_keys():
    """PyYAML silently keeps the last of two equal keys; a hand edit must not lose a section or a block that way."""

    class Strict(yaml.SafeLoader):
        pass

    def mapping(loader, node, deep=False):
        keys = [loader.construct_object(k, deep=deep) for k, _ in node.value]
        dupes = {k for k in keys if keys.count(k) > 1}
        assert not dupes, f"duplicate keys {dupes} near line {node.start_mark.line + 1}"
        return loader.construct_mapping(node, deep)

    Strict.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
    yaml.load((ADVENTURES / "mercy-island.yaml").read_text(encoding="utf-8"), Loader=Strict)  # noqa: S506


def test_index_lists_the_adventure():
    index = yaml.safe_load((ADVENTURES / "index.yaml").read_text(encoding="utf-8"))
    files = [a["file"] for a in index["adventures"]]
    assert "mercy-island.yaml" in files
    assert all((ADVENTURES / f).is_file() for f in files)


def test_every_link_points_to_a_section(adv):
    secs = sections(adv)
    special = [adv["start"], adv["on_death"], adv["on_madness"]]
    broken = [(sid, t) for sid, c in choices(adv) for t in targets(c) if t not in secs]
    broken += [("top", str(s)) for s in special if str(s) not in secs]
    assert not broken


def test_sections_have_choices_unless_they_are_endings(adv):
    for sid, sec in sections(adv).items():
        if sec.get("ending"):
            assert not sec.get("choices"), f"ending {sid} has choices"
        else:
            assert sec.get("choices"), f"section {sid} has no way out"
        assert sec.get("text", "").strip(), f"section {sid} has no text"


def test_every_section_is_reachable(adv):
    secs = sections(adv)
    seen, todo = set(), [str(adv["start"]), str(adv["on_death"]), str(adv["on_madness"])]
    while todo:
        sid = todo.pop()
        if sid in seen:
            continue
        seen.add(sid)
        for choice in secs[sid].get("choices") or []:
            todo.extend(targets(choice))
    assert set(secs) - seen == set()
    assert len([s for s in secs.values() if s.get("ending")]) >= 6


def test_section_count_and_lengths(adv):
    secs = sections(adv)
    assert 110 <= len(secs) <= 135
    words = sorted(len(s["text"].split()) for s in secs.values())
    assert words[0] < 60, "some sections should be short beats"
    assert words[-1] > 250, "some sections should be long set pieces"


def test_items_words_and_companions_are_defined(adv):
    items, journal = set(adv["items"]), set(adv["journal"])
    companions = {c["id"] for c in adv["companions"]} | {"all"}
    kits = {i for inv in adv["investigators"] for i in inv.get("kit", [])}
    gained = {e["gain"] for e in all_effects(adv) if "gain" in e} | kits
    noted = {e["note"] for e in all_effects(adv) if "note" in e}
    assert kits <= items
    for e in all_effects(adv):
        for key, pool in (
            ("gain", items),
            ("lose", items),
            ("note", journal),
            ("unnote", journal),
            ("companion", companions),
        ):
            if key in e:
                assert e[key] in pool, e
    for cond in all_conditions(adv):
        if "item" in cond or "no_item" in cond:
            assert cond.get("item", cond.get("no_item")) in items, cond
        if "item" in cond:
            assert cond["item"] in gained, f"{cond['item']} is required but never obtainable"
        if "note" in cond or "no_note" in cond:
            assert cond.get("note", cond.get("no_note")) in journal, cond
        if "note" in cond:
            assert cond["note"] in noted, f"{cond['note']} is required but never noted"
        for key in ("with", "broken", "gone"):
            if key in cond:
                assert cond[key] in companions, cond
    assert noted <= journal


def test_rolled_skills_exist(adv):
    known = set(adv["skills"]) | UNIVERSAL
    for sid, choice in choices(adv):
        if "roll" in choice:
            assert set(rolled_skills(choice)) <= known, (sid, choice["roll"])
            assert choice["roll"].get("difficulty", "regular") in {"regular", "hard", "extreme"}


def test_rolls_are_fair_to_the_whole_cast(adv):
    """Every roll is open to all (a characteristic, Luck or Dodge), gated behind the skill it needs,
    or trained by at least two of the six investigators."""
    for sid, choice in choices(adv):
        if "roll" not in choice:
            continue
        skills = rolled_skills(choice)
        if set(skills) & UNIVERSAL:
            continue
        if any("skill" in c for c in leaves(choice.get("requires"))):
            continue
        trained = [
            inv["id"]
            for inv in adv["investigators"]
            if any(inv["skills"].get(s, 0) >= TRAINED for s in skills)
        ]
        assert len(trained) >= 2, f"section {sid}: only {trained} can roll {skills}"


def test_every_investigator_uses_their_training(adv):
    rolled = {s for _, c in choices(adv) if "roll" in c for s in rolled_skills(c)} - UNIVERSAL
    for inv in adv["investigators"]:
        useful = {s for s, v in inv["skills"].items() if v >= TRAINED and s in rolled}
        assert len(useful) >= 3, f"{inv['id']} only gets to roll {sorted(useful)}"
        assert inv["hp"] == (inv["characteristics"]["CON"] + inv["characteristics"]["SIZ"]) // 10


# ---------------------------------------------------------------- playthrough simulator (mirrors app.js)


class Run:
    def __init__(self, adv, inv, rng):
        self.adv, self.inv, self.rng = adv, inv, rng
        self.secs = sections(adv)
        self.hp, self.san, self.luck = inv["hp"], inv["san"], inv["luck"]
        self.items, self.notes = set(inv.get("kit", [])), set()
        self.comp = {c["id"]: {"san": c["san"], "status": "with"} for c in adv["companions"]}
        self.path = []

    def dice(self, expr):
        s = str(expr).replace(" ", "").upper()
        sign = -1 if s.startswith("-") else 1
        total = 0
        for term in s.lstrip("+-").split("+"):
            if "D" in term:
                n, d = term.split("D")
                total += sum(self.rng.randint(1, int(d)) for _ in range(int(n or 1)))
            else:
                total += int(term or 0)
        return sign * total

    def skill(self, name):
        if name in CHARACTERISTICS:
            return self.inv["characteristics"][name]
        if name == "Luck":
            return self.luck
        if name == "Dodge":
            return self.inv["skills"].get("Dodge", self.inv["characteristics"]["DEX"] // 2)
        return self.inv["skills"].get(name, self.adv["skills"].get(name, 0))

    def check(self, req):
        if not req:
            return True
        if isinstance(req, list):
            return all(self.check(r) for r in req)
        tests = {
            "any": lambda v: any(self.check(r) for r in v),
            "item": lambda v: v in self.items,
            "no_item": lambda v: v not in self.items,
            "note": lambda v: v in self.notes,
            "no_note": lambda v: v not in self.notes,
            "with": lambda v: self.comp[v]["status"] == "with",
            "broken": lambda v: self.comp[v]["status"] == "broken",
            "gone": lambda v: self.comp[v]["status"] in ("lost", "dead"),
            "skill": lambda v: self.skill(v) >= req.get("min", 50),
        }
        return all(tests[k](v) for k, v in req.items() if k in tests)

    def sanity(self, spec, current):
        passed, failed = str(spec).split("/")
        return max(0, self.dice(passed if self.rng.randint(1, 100) <= current else failed))

    def apply(self, effects):
        for e in effects or []:
            if "companion" in e:
                ids = (
                    [i for i, c in self.comp.items() if c["status"] == "with"]
                    if e["companion"] == "all"
                    else [e["companion"]]
                )
                for i in ids:
                    c = self.comp[i]
                    if "status" in e:
                        c["status"] = e["status"]
                    if "san" in e and c["status"] == "with":
                        loss = (
                            self.sanity(e["san"], c["san"]) if "/" in str(e["san"]) else -self.dice(e["san"])
                        )
                        c["san"] -= loss
                        if c["san"] <= 0:
                            c["status"] = "broken"
                continue
            if "san" in e:
                loss = self.sanity(e["san"], self.san) if "/" in str(e["san"]) else -self.dice(e["san"])
                self.san = min(self.inv["san"], self.san - loss)
            if "hp" in e:
                self.hp = min(self.inv["hp"], self.hp + self.dice(e["hp"]))
            if "luck" in e:
                self.luck += self.dice(e["luck"])
            if "gain" in e:
                self.items.add(e["gain"])
            if "lose" in e:
                self.items.discard(e["lose"])
            if "note" in e:
                self.notes.add(e["note"])
            if "unnote" in e:
                self.notes.discard(e["unnote"])

    def enter(self, sid):
        sid = str(sid)
        self.path.append(sid)
        sec = self.secs[sid]
        self.apply(sec.get("effects"))
        if not sec.get("ending"):
            if self.hp <= 0 and sid != str(self.adv["on_death"]):
                return self.enter(self.adv["on_death"])
            if self.san <= 0 and sid != str(self.adv["on_madness"]):
                return self.enter(self.adv["on_madness"])
        return sid

    def play(self, limit=200):
        sid = self.enter(self.adv["start"])
        while not self.secs[sid].get("ending"):
            open_choices = [c for c in self.secs[sid]["choices"] if self.check(c.get("requires"))]
            assert open_choices, f"dead end at section {sid} on path {self.path}"
            choice = self.rng.choice(open_choices)
            self.apply(choice.get("effects"))
            if "roll" in choice:
                r = choice["roll"]
                value = max(self.skill(s) for s in rolled_skills(choice))
                target = {"regular": value, "hard": value // 2, "extreme": value // 5}[
                    r.get("difficulty", "regular")
                ]
                nxt = r["success"] if self.rng.randint(1, 100) <= target else r["failure"]
            else:
                nxt = choice["to"]
            sid = self.enter(nxt)
            assert len(self.path) < limit, f"runaway path: {self.path}"
        return self.secs[sid]


def test_random_playthroughs_have_no_dead_ends_and_last_20_to_30_sections(adv):
    rng = random.Random(1926)
    lengths, endings, broken = [], set(), 0
    for inv in adv["investigators"]:
        for _ in range(400):
            run = Run(adv, inv, rng)
            ending = run.play()
            lengths.append(len(run.path))
            endings.add(ending["title"])
            broken += any(c["status"] == "broken" for c in run.comp.values())
    mean = statistics.mean(lengths)
    assert 20 <= mean <= 30, f"average playthrough is {mean:.1f} sections"
    assert len(endings) >= 8, sorted(endings)
    # Companions going mad is part of the game: it has to happen, but not every time.
    assert 0.1 <= broken / len(lengths) <= 0.5, f"a companion broke in {broken / len(lengths):.0%} of runs"
