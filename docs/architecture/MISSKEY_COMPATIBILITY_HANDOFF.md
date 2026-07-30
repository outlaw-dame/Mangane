# Misskey Compatibility Handoff

Status: **Active handoff**

The next implementation work after the current continuity fixes must begin with [`PHASE_1B_MISSKEY_MARKDOWN_AND_MFM_COMPATIBILITY.md`](./PHASE_1B_MISSKEY_MARKDOWN_AND_MFM_COMPATIBILITY.md).

Do not proceed to broad editorial migration without first completing the inventory and fixture slice defined there.

Required first actions:

1. inventory inherited Markdown, content-type, Misskey, and MFM behavior;
2. capture redacted direct and federated Misskey-family fixtures;
3. map all parsers, sanitizers, linkifiers, emoji processors, and HTML sinks;
4. define paired-fixture equivalence expectations;
5. select the canonical content AST and parser ownership boundary;
6. create the dedicated compatibility CI job before enabling runtime display support.

This handoff exists because GitHub Issues are disabled for this repository. It must be removed or marked complete only when the canonical roadmap and implementation evidence fully absorb these requirements.
