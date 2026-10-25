# Local editorial refresh — 25 October 2026

This is a new, bounded editorial pass over the listening-pointer draft, not a recovered earlier revision. It is not a production release.

## Source and scope

- Remote source: PR 36, `3ead54cc1dbb47f0a375288652709f51e40e46dc`.
- Source tree: `2d015fef4251769078d1d8d93ee75e5ba6c25508`.
- Exact before/after prose and rationale: `editorial-refresh-20261025.json`.
- Twelve bilingual passages, twenty-four changed text values: seven safe character introductions, three dramatic-analysis clarifications, one Hugo chronology clarification and one explanation of the musical’s writing credits/process.

The character introductions start with practical circumstances: food, shelter, wages, care and hospitality. The analysis of “Who Am I?” no longer tells the reader that the dilemma has an “obvious” answer. Two Hebrew pronoun references are made explicit, with matching English clarity. The Hugo passage names the novel following *Hernani*, and the credits passage explains what “book”/“libretto” means in a musical.

## Read and deliberately retained

The review covered the ten character introductions, all thirty-eight dramatic song-analysis blocks, seven Hugo sections, five ethical dilemmas, seven spotlight backgrounds, five pre-show stops and the creation-history panels/craft passages. Existing October 12/13/20 work already supplies substantial scene-led explanation. Strong passages were retained rather than rewritten to meet a numerical target. Independent review specifically recommended retaining the original Marius, Éponine and Enjolras entrances and all five dilemmas. An album-panel draft was also dropped after route inspection showed that field was not currently rendered.

No listening questions or answer pointers were rewritten. Within the editorial subset, all other parsed content keys and values remain unchanged, including source references/URLs, quotes, dates, metadata, watch information and spoiler flags. The listening-pointer implementation is byte-identical. No application runtime, layout or consent code changed.

## Review and checks

- Independent HE/EN prose review approved the final set; factual nuance and existing disclosure boundaries preserved.
- Independent code review found no weakened assertions. Historical snapshots retain their old expected hashes: the helper first verifies each exact reviewed new value, then restores only the listed old prose for historical comparison.
- Build: 76 localized pages plus root and 404 generated.
- Full local suite: 41 validators passed; 404 Node tests passed, 1 existing opt-in browser test skipped, 0 failed.
- Export guard: 646 text files passed.
- Additional VM/render checks found all 24 edited values on their intended routes. The six protected values are absent before spoiler consent and after withdrawal.
- Syntax, exact semantic-diff and whitespace checks passed.

The renderer checks are not a visual browser test. This fresh local candidate has not had desktop/narrow visual or keyboard QA in a browser. Earlier hosted PR 36 QA validates the unchanged listening feature, not this new prose. The review does not claim a fresh audit of every inherited historical fact or any recording.

## Combined draft scope

This candidate also includes the separately reviewed October 25 watch-status correction: the two dated North American local runs are now labeled as ended, with the card’s checked date updated. Its five-field before/after fixture is `test/fixtures/watch-status-20261025.json`. The editorial and watch historical-normalization layers remain independent and assert exact new values before restoring old snapshot values. This combined draft is stacked on PR36; production is unchanged. The original editorial prose review and its local checks above remain a historical record, not a claim that hosted checks have already run for the combined draft.
