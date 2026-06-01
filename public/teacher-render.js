(function () {
  function renderTeacherProgressSteps(ui) {
    const step = ui.teacherAssist ? 3 : (ui.teacherDraft.brief ? 2 : 1);
    const labels = ["Rubric", "Brief + generate", "Review + save"];
    return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;">
      ${labels.map((label, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < step;
        const active = stepNumber === step;
        return `<div style="display:flex;align-items:center;gap:6px;flex:1;">
          <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
            background:${done ? "var(--accent-deep)" : active ? "var(--accent)" : "var(--surface-soft)"};
            color:${done || active ? "#fff" : "var(--muted)"};
            border:1px solid ${done ? "var(--accent-deep)" : active ? "var(--accent)" : "var(--line)"};">
            ${done ? "✓" : stepNumber}
          </div>
          <span style="font-size:0.78rem;color:${active ? "var(--ink)" : "var(--muted)"};font-weight:${active ? 700 : 400};">${label}</span>
          ${index < 2 ? '<div style="flex:1;height:1px;background:var(--line);"></div>' : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderTeacherGenerateButton(ui) {
    const { getTeacherGenerateButtonState } = globalThis.AiAssistUtils;
    const generateButton = getTeacherGenerateButtonState({ loading: ui.aiAssistLoading });
    return `
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-top:10px;">
        <button class="button" data-action="generate-teacher-assist" ${generateButton.disabled ? "disabled" : ""}>
          ${generateButton.label}
        </button>
        <span class="subtle" style="font-size:0.78rem;">Advances to Step 3</span>
      </div>
    `;
  }

  function renderTeacherAssignmentSettingsFields(ui, idPrefix) {
    const { escapeHtml, escapeAttribute, titleCase, getVisibleChatTimeLimit } = globalThis.window;
    const { buildDeadlineTimeOptions, getDeadlineDatePart, getDeadlineTimePart } = globalThis.DeadlineUtils;
    return `
      <div class="field-grid compact-grid">
        <div class="field">
          <label for="${idPrefix}-assignment-type">Assignment type</label>
          <select id="${idPrefix}-assignment-type" data-teacher-field="assignmentType">
           ${["argument", "opinion", "narrative", "informational", "process", "definition", "compare/contrast", "response", "other"].map((t) => `<option value="${t}" ${ui.teacherDraft.assignmentType === t ? "selected" : ""}>${titleCase(t)}</option>`).join("")}
          </select>
          ${ui.teacherDraft.assignmentType === "other" ? `
            <input id="teacher-other-type" data-teacher-field="assignmentTypeOther" value="${escapeAttribute(ui.teacherDraft.assignmentTypeOther || "")}" placeholder="Describe the assignment type" style="margin-top:8px;width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 12px;" />
          ` : ""}
        </div>
        <div class="field">
          <label for="${idPrefix}-word-min">Min words</label>
          <input id="${idPrefix}-word-min" data-teacher-field="wordCountMin" type="number" min="0" value="${escapeAttribute(String(ui.teacherDraft.wordCountMin))}" />
        </div>
        <div class="field">
          <label for="${idPrefix}-word-max">Max words</label>
          <input id="${idPrefix}-word-max" data-teacher-field="wordCountMax" type="number" min="0" value="${escapeAttribute(String(ui.teacherDraft.wordCountMax))}" />
        </div>
        <div class="field">
          <label for="${idPrefix}-feedback-limit">Feedback checks</label>
          <input id="${idPrefix}-feedback-limit" data-teacher-field="feedbackRequestLimit" type="number" min="0" value="${escapeAttribute(String(ui.teacherDraft.feedbackRequestLimit))}" />
        </div>
        <div class="field">
          <label>Total points</label>
          ${ui.teacherAssist
            ? `<div style="font-size:1.1rem;font-weight:700;padding:8px 0;">${ui.teacherAssist.rubric.reduce((s, r) => s + Number(r.points || 0), 0)} pts (auto-calculated from rubric)</div>`
            : `<input id="${idPrefix}-total-points" data-teacher-field="totalPoints" type="number" min="4" value="${escapeAttribute(String(ui.teacherDraft.totalPoints))}" />`
          }
        </div>
        <div class="field">
          <label for="${idPrefix}-chat-limit">Chat time limit (mins, 0 = unlimited)</label>
          <input id="${idPrefix}-chat-limit" data-teacher-field="chatTimeLimit" type="number" min="0" value="${escapeAttribute(String(getVisibleChatTimeLimit(ui.teacherDraft)))}" ${ui.teacherDraft.disableChatbot ? "disabled" : ""} />
        </div>
        <div class="field" style="display:flex;align-items:flex-end;">
          <label style="display:flex;gap:10px;align-items:center;min-height:44px;padding:0 4px;font-weight:600;">
            <input id="${idPrefix}-disable-chatbot" data-teacher-field="disableChatbot" type="checkbox" ${ui.teacherDraft.disableChatbot ? "checked" : ""} />
            Disable chatbot
          </label>
        </div>
        <div class="field" style="grid-column:1 / -1;">
          <label style="display:flex;gap:10px;align-items:flex-start;padding:0 4px;font-weight:600;">
            <input id="${idPrefix}-auto-outline" data-teacher-field="autoOutlineFromChat" type="checkbox" ${ui.teacherDraft.autoOutlineFromChat ? "checked" : ""} ${ui.teacherDraft.disableChatbot ? "disabled" : ""} style="margin-top:3px;" />
            <span>
              Auto-build an outline from the coach chat
              <span class="subtle" style="display:block;font-weight:400;font-size:0.82rem;">When the student reaches the draft page, the coach turns their chat into an editable idea-outline (notes only — no sentences). Needs the chatbot enabled.</span>
            </span>
          </label>
        </div>
        <div class="field" style="grid-column:1 / -1;">
          <label for="${idPrefix}-deadline-date">Deadline</label>
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:8px;align-items:end;">
            <div style="min-width:0;">
              <input id="${idPrefix}-deadline-date" type="date" value="${escapeAttribute(getDeadlineDatePart(ui.teacherDraft.deadline))}" style="width:100%;min-width:0;" />
            </div>
            <select id="${idPrefix}-deadline-time">
              ${buildDeadlineTimeOptions(getDeadlineTimePart(ui.teacherDraft.deadline))}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="${idPrefix}-language-level">Student language level</label>
          <select id="${idPrefix}-language-level" data-teacher-field="languageLevel">
            ${["A0", "A1", "A2", "B1", "B2", "C1", "C2"].map((level) => `<option value="${level}" ${ui.teacherDraft.languageLevel === level ? "selected" : ""}>${escapeHtml(level)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }
  function renderClassRosterMemberRow(member, index, escapeHtml, escapeAttribute) {
    const isPending = member.status === "pending";
    const safeName = escapeAttribute(member.name || "Student");
    const label = isPending
      ? `<span class="subtle" style="display:block;font-size:0.74rem;margin-bottom:3px;color:var(--accent-deep);">Awaiting approval</span>`
      : `<span class="subtle" style="display:block;font-size:0.74rem;margin-bottom:3px;">Student ${index + 1}</span>`;
    const nameCell = isPending
      ? `<strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(member.name || "Student")}</strong>`
      : `<button data-action="grade-student-from-roster" data-student-id="${member.id}" title="Open this student's work to grade it" style="background:none;border:none;padding:0;margin:0;cursor:pointer;color:var(--accent-deep);font-weight:700;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-decoration:underline;text-underline-offset:2px;">${escapeHtml(member.name || "Student")}</button>`;
    const actions = isPending
      ? `<button class="button" data-action="approve-class-member" data-student-id="${member.id}" data-student-name="${safeName}" style="font-size:0.78rem;white-space:nowrap;">Approve</button>
         <button class="button-ghost" data-action="remove-class-member" data-student-id="${member.id}" data-student-name="${safeName}" style="font-size:0.78rem;color:var(--danger);border-color:var(--danger);white-space:nowrap;">Decline</button>`
      : `<button class="button-ghost" data-action="edit-class-member-name" data-student-id="${member.id}" data-student-name="${safeName}" style="font-size:0.78rem;white-space:nowrap;">Rename</button>
         <button class="button-ghost" data-action="remove-class-member" data-student-id="${member.id}" data-student-name="${safeName}" style="font-size:0.78rem;color:var(--danger);border-color:var(--danger);white-space:nowrap;">Remove</button>`;
    const rowStyle = isPending
      ? "border:1px solid var(--accent);border-radius:12px;padding:10px 12px;background:var(--accent-soft);display:flex;justify-content:space-between;gap:12px;align-items:center;"
      : "border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fbfdff;display:flex;justify-content:space-between;gap:12px;align-items:center;";
    return `
      <div style="${rowStyle}">
        <div style="min-width:0;">
          ${label}
          ${nameCell}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          ${actions}
        </div>
      </div>
    `;
  }

  function renderClassRosterMembers(classRoster, escapeHtml, escapeAttribute) {
    const ordered = [...classRoster].sort((a, b) => {
      const aPending = a.status === "pending" ? 0 : 1;
      const bPending = b.status === "pending" ? 0 : 1;
      return aPending - bPending;
    });
    let approvedIndex = 0;
    return ordered
      .map((member) => {
        const index = member.status === "pending" ? 0 : approvedIndex++;
        return renderClassRosterMemberRow(member, index, escapeHtml, escapeAttribute);
      })
      .join("");
  }

  function renderTeacherWorkspace() {
    const { ui, state, currentClasses, currentClassId, currentClassMembers, currentProfile } = globalThis.AppState;
    const { escapeHtml, escapeAttribute, renderRichTextHtml, renderUploadedRubricPreview,
      renderPromptFormattingToolbar, titleCase, truncateText, stripPromptFormatting,
      isPasteLikeWritingEvent, getSavedRubricLibrary,
      getTeacherAssignmentSaveLabel, getSubmissionCountsForAssignment,
      getSelectedReviewSubmission } = globalThis;
    const { PRODUCT_NAME } = globalThis.AppConstants;

    const assignments = currentClassId
      ? state.assignments.filter((assignment) => !assignment.classId || assignment.classId === currentClassId)
      : [];
    const classRoster = currentClassMembers.filter((member) => member?.id !== currentProfile?.id);
    const selectedAssignment = assignments.find(a => a.id === ui.selectedAssignmentId) || null;
    const submissions = state.submissions.filter(s => s.assignmentId === ui.selectedAssignmentId);
    const selectedSubmission = selectedAssignment && ui.teacherView === "grading"
      ? getSelectedReviewSubmission()
      : (state.submissions.find(s => s.id === ui.selectedReviewSubmissionId) || null);
    const savedRubrics = getSavedRubricLibrary();
    const selectedSavedRubric = savedRubrics.find((entry) => entry.id === ui.selectedSavedRubricId) || null;
    const manualSaveReady = Boolean(
      ui.teacherAssist || ((ui.teacherDraft.title || "").trim() && (ui.teacherDraft.prompt || "").trim())
    );
    const hasUploadedRubricPreview = Boolean(
      ui.teacherDraft.uploadedRubricText || ui.teacherDraft.uploadedRubricSchema?.criteria?.length || ui.teacherDraft.uploadedRubricData?.rows?.length
    );
    const rubricUploadField = `
    <div class="field">
      <label>Rubric (optional — drag and drop or click to upload)</label>
      <div id="rubric-drop-zone" style="border:2px dashed var(--line);border-radius:12px;padding:28px 18px;min-height:124px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:#fafaf8;display:grid;place-items:center;"
        ondragover="event.preventDefault();this.style.borderColor='var(--accent)';"
        ondragleave="this.style.borderColor='var(--line)';"
        ondrop="handleRubricDrop(event);"
        onclick="document.getElementById('rubric-file-input').click();">
        ${ui.teacherDraft.uploadedRubricText
          ? `<p style="color:var(--accent-deep);font-weight:600;margin:0;">✓ Rubric loaded — ${ui.teacherDraft.uploadedRubricSchema?.criteria?.length || ui.teacherDraft.uploadedRubricData?.rows?.length || 0} criteria ready</p>
             <button class="button-ghost" style="margin-top:8px;font-size:0.8rem;" onclick="event.stopPropagation();clearUploadedRubric();">Remove</button>`
          : `<p style="color:var(--muted);margin:0;">Drop your rubric PDF or Word doc here, or click to browse</p>`
        }
      </div>
      <input type="file" id="rubric-file-input" accept=".pdf,.doc,.docx" style="display:none;" onchange="handleRubricFile(this.files[0]);" />
      ${savedRubrics.length ? `
        <div style="margin-top:10px;">
          <label for="saved-rubric-select" style="font-size:0.82rem;color:var(--muted);display:block;margin-bottom:6px;">Use a previous rubric</label>
          <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
            <select id="saved-rubric-select" style="flex:1;min-width:240px;">
              <option value="">Select a saved rubric</option>
              ${savedRubrics.map((entry) => `<option value="${entry.id}" ${ui.selectedSavedRubricId === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("")}
            </select>
            ${ui.selectedSavedRubricId
              ? `<button class="button-ghost" data-action="clear-saved-rubric-selection" style="min-height:42px;">Clear</button>`
              : ""
            }
            ${selectedSavedRubric?.source === "upload"
              ? `<button class="button-ghost" data-action="remove-saved-rubric" data-rubric-id="${selectedSavedRubric.id}" style="min-height:42px;">Remove saved rubric</button>`
              : ""
            }
          </div>
          ${selectedSavedRubric && selectedSavedRubric.source !== "upload"
            ? `<p class="subtle" style="font-size:0.78rem;margin-top:6px;">This rubric is attached to an existing assignment, so it stays in the list.</p>`
            : ""
          }
        </div>
      ` : ""}
    </div>
  `;

    return `
    <section class="teacher-grid">
      <div class="panel panel-tight">
        <div class="panel-header">
          <div>
            <p class="mini-label">Teacher Setup</p>
            <h2 class="panel-title">Describe the assignment in plain English</h2>
            ${ui.editingAssignmentId ? `<p class="subtle" style="margin:6px 0 0;">Editing an existing assignment. Changes will update the published version too.</p>` : ""}
          </div>
          <div class="toolbar">
            ${ui.editingAssignmentId ? `<button class="button-ghost" data-action="cancel-assignment-edit" ${ui.aiAssistLoading ? "disabled" : ""}>Cancel edit</button>` : ""}
          </div>
        </div>
        ${renderTeacherProgressSteps(ui)}
<div class="field-stack">
          <div id="teacher-rubric-upload" class="teacher-ready-card" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;">
              <div>
                <p class="mini-label" style="margin-bottom:4px;">Step 1 — Rubric (optional)</p>
                <p class="subtle">Upload or reuse a rubric. The AI will shape its output to match.</p>
              </div>
              <span class="pill">Current class: ${escapeHtml(currentClasses.find((c) => c.id === currentClassId)?.name || "None")}</span>
            </div>
            ${rubricUploadField}
          </div>
          <div class="teacher-ready-card" style="padding:16px;">
            <div style="margin-bottom:10px;">
              <p class="mini-label" style="margin-bottom:4px;">Step 2 — Your brief</p>
              <p class="subtle">Describe the assignment in plain English, then click Create student-ready version.</p>
            </div>
            <textarea id="teacher-brief" data-teacher-field="brief" class="teacher-brief" placeholder="Example: My 7th grade students need a short opinion paragraph about whether school uniforms help learning. Keep the language simple, ask for one real example, and aim for 250 to 350 words. Give them 2 feedback checks.">${escapeHtml(ui.teacherDraft.brief)}</textarea>
            ${renderTeacherGenerateButton(ui)}
          </div>
          ${ui.aiAssistLoading ? `
            <div class="teacher-ready-card" style="padding:16px;border-color:var(--accent);">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                <div>
                  <p class="mini-label" style="margin-bottom:4px;">AI is thinking…</p>
                  <p class="subtle">You can cancel, fix the brief or settings, and try again.</p>
                </div>
                <button class="button-ghost" data-action="cancel-teacher-assist" style="min-height:36px;padding:0 12px;">✕</button>
              </div>
            </div>
          ` : ""}
          <details id="teacher-shared-settings" class="teacher-ready-card" style="padding:16px;"
  ${ui.teacherAssist || ui.teacherDraft.title ? "open" : ""}>
  <summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;">
    <div>
      <p class="mini-label" style="margin-bottom:4px;">Step 3 — Assignment settings</p>
      <p class="subtle">Word limits, deadline, chatbot, language level.</p>
    </div>
    <span class="pill">${ui.teacherAssist || ui.teacherDraft.title ? "Ready" : "After draft"}</span>
  </summary>
  <div style="margin-top:14px;">
    ${renderTeacherAssignmentSettingsFields(ui, "teacher")}
  </div>
</details>
        </div>
        ${
          ui.teacherAssist
            ? `
              <div id="teacher-generated-assignment" class="teacher-output">
                <div class="section-header" style="border-left:3px solid var(--accent);padding-left:12px;">
                  <div>
                    <p class="mini-label">Step 3 — Review AI draft</p>
                    <input class="assist-title-input" data-assist-field="title" value="${escapeAttribute(ui.teacherAssist.title)}" placeholder="Assignment title" />
                  </div>
                </div>
                <div class="teacher-ready-card">
                  <p class="mini-label">Student instructions</p>
                  <div class="field" style="margin-bottom:10px;">
                    <label style="display:flex;align-items:center;gap:6px;">
                      Task prompt
                      <span style="font-size:0.7rem;padding:1px 6px;border-radius:8px;background:#fff8ed;color:var(--accent-deep);border:1px solid var(--accent);">✨ AI</span>
                    </label>
                    ${renderPromptFormattingToolbar("teacher-assist-prompt")}
                    <textarea id="teacher-assist-prompt" data-assist-field="prompt">${escapeHtml(ui.teacherAssist.prompt)}</textarea>
                  </div>
                  <div class="field-grid" style="margin-bottom:10px;">
                    <div class="field">
                      <label>Min words</label>
                      <input type="number" data-assist-field="wordCountMin" value="${ui.teacherAssist.wordCountMin}" />
                    </div>
                    <div class="field">
                      <label>Max words</label>
                      <input type="number" data-assist-field="wordCountMax" value="${ui.teacherAssist.wordCountMax}" />
                    </div>
                  </div>
                  <div class="field">
                    <label>Assignment type</label>
                    <select data-assist-field="assignmentType">
                     ${["argument", "opinion", "narrative", "informational", "process", "definition", "compare/contrast", "response", "other"].map((t) => `<option value="${t}" ${ui.teacherAssist.assignmentType === t ? "selected" : ""}>${titleCase(t)}</option>`).join("")}
                    </select>
                  </div>
                </div>
                <div class="teacher-ready-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <p class="mini-label" style="display:flex;align-items:center;gap:6px;">
                      Rubric
                      <span style="font-size:0.7rem;padding:1px 6px;border-radius:8px;background:#fff8ed;color:var(--accent-deep);border:1px solid var(--accent);">✨ AI</span>
                    </p>
                    <span class="pill">${ui.teacherAssist.rubric.reduce((s, r) => s + Number(r.points || 0), 0)} pts total</span>
                  </div>
                  ${hasUploadedRubricPreview
                    ? `
                    `
                    : `
                      <div class="review-stack">
                        ${ui.teacherAssist.rubric.map((item) => `
                          <div class="rubric-edit-row">
                            <div class="rubric-edit-fields">
                              <input data-rubric-id="${item.id}" data-rubric-field="name" value="${escapeAttribute(item.name)}" placeholder="Criterion name" style="font-weight:700;" />
                              <input data-rubric-id="${item.id}" data-rubric-field="description" value="${escapeAttribute(item.description)}" placeholder="Description" />
                            </div>
                            <div class="rubric-edit-right">
                              <input type="number" data-rubric-id="${item.id}" data-rubric-field="points" value="${item.points}" min="1" style="width:60px;text-align:center;" />
                              <span class="subtle" style="font-size:0.82rem;">pts</span>
                              <button class="button-ghost" data-action="remove-rubric-row" data-rubric-id="${item.id}" style="color:var(--danger);border-color:var(--danger);padding:0 10px;min-height:36px;">✕</button>
                            </div>
                          </div>
                        `).join("")}
                      </div>
                      <button class="button-ghost" data-action="add-rubric-row" style="margin-top:10px;">+ Add criterion</button>
                    `
                  }
                </div>

                                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                  <button class="button" data-action="save-assignment" ${ui.aiAssistLoading || ui.assignmentSaving ? "disabled" : ""}>
                    ${getTeacherAssignmentSaveLabel()}
                  </button>
                </div>              </div>
            `
            : `
              <div id="teacher-generated-assignment" class="teacher-output">
                <details class="teacher-ready-card" ${(ui.teacherDraft.title || ui.teacherDraft.prompt) ? "open" : ""}>
                  <summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div>
                      <p class="mini-label" style="margin-bottom:4px;">Manual assignment setup</p>
                      <p class="subtle">Skip AI if you already know the student-facing title and prompt. Fill these in manually, then save when you're ready.</p>
                    </div>
                    <span class="pill">${(ui.teacherDraft.title || ui.teacherDraft.prompt) ? "In progress" : "Optional"}</span>
                  </summary>
                  <div style="margin-top:14px;">
                    <div class="field" style="margin-bottom:10px;">
                      <label for="teacher-title">Assignment title</label>
                      <input id="teacher-title" data-teacher-field="title" value="${escapeAttribute(ui.teacherDraft.title)}" placeholder="Assignment title" />
                    </div>
                    <div class="field" style="margin-bottom:10px;">
                      <label for="teacher-prompt">Task prompt</label>
                      ${renderPromptFormattingToolbar("teacher-prompt")}
                      <textarea id="teacher-prompt" data-teacher-field="prompt" placeholder="Write the instructions students will see.">${escapeHtml(ui.teacherDraft.prompt)}</textarea>
                    </div>
                    <p class="subtle" style="font-size:0.84rem;margin:6px 0 0;">Use the shared settings above for assignment type, word limits, deadline, chatbot, language level, and feedback limits.</p>
                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                      <button class="button" data-action="save-assignment" ${!manualSaveReady || ui.aiAssistLoading || ui.assignmentSaving ? "disabled" : ""}>${getTeacherAssignmentSaveLabel()}</button>
                    </div>
                  </div>
                </details>
              </div>
            `
        }
      </div>

      <div class="panel panel-tight">
        <div class="panel-header">
          <div>
            <p class="mini-label">Teacher Review</p>
            <h2 class="panel-title">Assignments</h2>
          </div>
          <button class="button-ghost" data-action="refresh-assignment-statuses" style="font-size:0.82rem;">Refresh statuses</button>
        </div>
        <details class="teacher-ready-card" style="margin-bottom:16px;">
          <summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
            <div>
              <p class="mini-label" style="margin-bottom:4px;">Class list</p>
              <p class="subtle" style="margin-bottom:0;">Students currently enrolled in ${escapeHtml(currentClasses.find((c) => c.id === currentClassId)?.name || "this class")}.</p>
            </div>
            ${(() => {
              const pendingCount = classRoster.filter((m) => m.status === "pending").length;
              const approvedCount = classRoster.length - pendingCount;
              if (pendingCount) {
                return `<span class="pill" style="color:var(--accent-deep);border-color:var(--accent);">${approvedCount} student${approvedCount === 1 ? "" : "s"} · ${pendingCount} pending</span>`;
              }
              return `<span class="pill">${classRoster.length} student${classRoster.length === 1 ? "" : "s"}</span>`;
            })()}
          </summary>
          <div style="margin-top:12px;">
          ${classRoster.length
            ? `<div style="display:grid;gap:8px;">
                ${renderClassRosterMembers(classRoster, escapeHtml, escapeAttribute)}
              </div>`
            : `<div class="empty-state compact-empty"><h3>No students yet</h3><p>Invite students to this class to start building the roster.</p></div>`
          }
          </div>
        </details>
        ${
          !assignments.length
            ? `<div class="empty-state" style="padding:36px 28px;">
                <div style="font-size:2.5rem;margin-bottom:12px;">✏️</div>
                <h3 style="margin:0 0 8px;">Welcome to ${PRODUCT_NAME}</h3>
                <p style="margin:0 0 20px;max-width:320px;margin-inline:auto;">Describe your assignment in plain English on the left, then click <strong>Format With AI</strong> to generate a student-ready task in seconds.</p>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                  <button class="button" data-action="focus-brief">Start your first assignment</button>
                </div>
              </div>`
            : `
              <div class="assignment-list">
                ${assignments.map((assignment) => {
                  const assignmentSubs = state.submissions.filter(s => s.assignmentId === assignment.id);
                  const statusCounts = getSubmissionCountsForAssignment(assignment.id, classRoster);
                  const submittedCount = statusCounts.submitted;
                  const gradedCount = statusCounts.graded;
                  const pasteCount = assignmentSubs.filter(s => (s.writingEvents || []).some((entry) => isPasteLikeWritingEvent(entry))).length;
                  const totalStudents = statusCounts.total;
                  const isBriefExpanded = ui.expandedAssignmentBriefId === assignment.id;
                  const isSavedFocus = ui.savedAssignmentFocusId === assignment.id;
                  const isPublishing = ui.publishingAssignmentId === assignment.id;
                  const promptPreview = truncateText(stripPromptFormatting(assignment.prompt), 140);
                  return `
                  <div class="assignment-card simple-card" id="assignment-card-${escapeAttribute(assignment.id)}" style="${isSavedFocus ? "box-shadow:0 0 0 3px rgba(76,111,231,0.22);border-color:var(--accent);" : ""}">
                    <div class="card-top" style="align-items:flex-start;">
                      <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                          <h3 style="margin:0;">${escapeHtml(assignment.title)}</h3>
                          <span class="${assignment.status === "published" ? "pill" : "warning-pill"}" style="font-size:0.75rem;">${assignment.status === "published" ? "Published" : "Draft"}</span>
                        </div>
                        ${isBriefExpanded
                          ? `<div style="margin:0 0 8px;color:var(--muted);font-size:0.9rem;line-height:1.55;">${renderRichTextHtml(assignment.prompt)}</div>`
                          : `<p style="margin:0 0 8px;color:var(--muted);font-size:0.88rem;">${escapeHtml(promptPreview)}</p>`
                        }
                        ${assignment.prompt && assignment.prompt.length > 140 ? `
                          <button class="button-ghost" data-action="toggle-assignment-brief" data-assignment-id="${assignment.id}" style="font-size:0.78rem;padding:6px 10px;margin:0 0 10px;">
                            ${isBriefExpanded ? "Hide brief" : "View full brief"}
                          </button>
                        ` : ""}
                        <div class="pill-row" style="flex-wrap:wrap;">
                          <span class="pill">${escapeHtml(titleCase(assignment.assignmentType || "writing"))}</span>
                          <span class="pill">${assignment.wordCountMin}–${assignment.wordCountMax} words</span>
                          ${assignment.deadline ? `<span class="pill">Due: ${escapeHtml(new Date(assignment.deadline).toLocaleDateString(undefined, {day:"numeric",month:"short"}))}</span>` : ""}
                          <span class="pill">${submittedCount}/${totalStudents} submitted</span>
                          ${gradedCount > 0 ? `<span class="pill" style="color:var(--sage);border-color:var(--sage);">✓ ${gradedCount} graded</span>` : ""}
                          ${pasteCount > 0 ? `<button class="warning-pill" data-action="open-paste-flag" data-assignment-id="${assignment.id}" style="cursor:pointer;">⚠ ${pasteCount} paste flag${pasteCount > 1 ? "s" : ""}</button>` : ""}
                        </div>
                      </div>
                      <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;align-items:flex-end;">
                        <button class="button" data-action="select-assignment" data-assignment-id="${assignment.id}" style="white-space:nowrap;">Review students →</button>
                        <div style="display:flex;gap:6px;">
                          <button class="button-ghost" data-action="edit-assignment" data-assignment-id="${assignment.id}" style="font-size:0.8rem;">Edit</button>
                          <button class="${assignment.status === "published" ? "button-ghost" : "button-secondary"}" data-action="publish-assignment" data-assignment-id="${assignment.id}" ${isPublishing ? "disabled" : ""} style="font-size:0.8rem;${assignment.status === "published" ? "color:var(--sage);border-color:var(--sage);" : ""}${isSavedFocus && assignment.status !== "published" ? "box-shadow:0 0 0 4px rgba(76,111,231,0.20);" : ""}">
                            ${isPublishing ? (assignment.status === "published" ? "Unpublishing..." : "Publishing...") : assignment.status === "published" ? "✓ Published" : "Publish"}
                          </button>
                          <button class="button-ghost" data-action="delete-assignment" data-assignment-id="${assignment.id}" style="font-size:0.8rem;color:var(--danger);border-color:var(--danger);">Delete</button>
                        </div>
                        ${isSavedFocus && assignment.status !== "published" ? `<span class="warning-pill" style="font-size:0.74rem;">Ready to publish when you are happy with it</span>` : ""}
                      </div>
                    </div>
                  </div>
                `}).join("")}
              </div>
            `
        }
      </div>
      ${hasUploadedRubricPreview ? `
        <div class="panel panel-tight" style="grid-column:1 / -1;">
         ${renderUploadedRubricPreview("Uploaded rubric preview", ui.teacherDraft.uploadedRubricText, ui.teacherDraft.uploadedRubricName, ui.teacherDraft.uploadedRubricData, ui.teacherDraft.uploadedRubricSchema)}

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button class="button" data-action="save-assignment" ${!manualSaveReady || ui.aiAssistLoading || ui.assignmentSaving ? "disabled" : ""}>
            ${getTeacherAssignmentSaveLabel()}
          </button>
        </div>
        </div>
      ` : ""}
    </section>
    ${ui.teacherView === "review" && selectedAssignment ? renderTeacherReview(selectedAssignment, submissions) : ""}
    ${ui.teacherView === "grading" && selectedAssignment && selectedSubmission ? renderTeacherGrading(selectedAssignment, selectedSubmission) : ""}
  `;
  }

  function renderTeacherReview(assignment, submissions) {
    const { currentClassMembers } = globalThis.AppState;
    const { escapeHtml, getReviewRoster, levelTheme } = globalThis.window;
    const { getAssignmentSubmissionCounts, isSubmissionGraded } = globalThis.SubmissionUtils;
    const { buildCriterionAnalytics } = globalThis.ReviewUtils;

    const roster = currentClassMembers.length ? currentClassMembers : getReviewRoster(assignment.id);
    const statusCounts = getAssignmentSubmissionCounts(submissions, roster);
    const total = statusCounts.total;
    const submittedCount = statusCounts.submitted;
    const gradedCount = statusCounts.graded;
    const flaggedCount = submissions.filter(
      s => Array.isArray(s.writingEvents) && s.writingEvents.some((entry) => globalThis.isPasteLikeWritingEvent(entry))
    ).length;
    const criterionAnalytics = buildCriterionAnalytics(assignment, submissions.filter((submission) => isSubmissionGraded(submission)));
    const hasCriterionAnalytics = criterionAnalytics.some((criterion) => criterion.gradedCount > 0);

    return `
          <section id="teacher-review-section" class="panel review-shell">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
        <button class="button-ghost" data-action="back-to-assignments" style="font-size:0.85rem;">← Assignments</button>
        <span style="color:var(--muted);font-size:0.85rem;">/</span>
        <span style="font-weight:600;font-size:0.95rem;">${escapeHtml(assignment.title)}</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;">${submittedCount}/${total}</div>
          <div style="font-size:0.75rem;color:var(--muted);">Submitted</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;">${gradedCount}</div>
          <div style="font-size:0.75rem;color:var(--muted);">Graded</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;">${statusCounts.notSubmitted}</div>
          <div style="font-size:0.75rem;color:var(--muted);">Not submitted</div>
        </div>
        <div style="background:${flaggedCount ? "#fff3cd" : "var(--surface)"};border:1px solid ${flaggedCount ? "#e0c84a" : "var(--line)"};border-radius:10px;padding:12px;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;">${flaggedCount}</div>
          <div style="font-size:0.75rem;color:var(--muted);">Paste flags</div>
        </div>
      </div>

      <details id="teacher-review-panel" class="teacher-ready-card" style="margin-bottom:18px;">
        <summary style="cursor:pointer;list-style-position:inside;">
          <span class="mini-label" style="margin-right:8px;">Grade analytics</span>
          <span class="pill">${gradedCount} graded so far</span>
        </summary>
        <div style="margin-top:12px;">
          <p class="subtle" style="margin:0 0 12px;">After you grade a class set, this shows where students collectively struggled on each criterion.</p>
          ${hasCriterionAnalytics ? `
            <div style="display:grid;gap:10px;">
              ${criterionAnalytics.map((criterion) => `
                <div style="border:1px solid var(--line);border-radius:14px;padding:14px;background:#fbfdff;">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;">
                    <div>
                      <strong style="display:block;margin-bottom:4px;">${escapeHtml(criterion.criterionName)}</strong>
                      <span class="subtle">Average ${criterion.averageScore.toFixed(1)}/${criterion.maxPoints}</span>
                    </div>
                    <span class="pill">${criterion.gradedCount} graded</span>
                  </div>
                  <div style="display:grid;gap:8px;">
                    ${criterion.distribution.map((band) => `
                      <div style="display:grid;grid-template-columns:minmax(160px,220px) minmax(0,1fr) auto;gap:10px;align-items:center;">
                        <span class="rubric-level-legend-chip" style="width:100%;background:${levelTheme(band.label).badge};color:${levelTheme(band.label).text};">${escapeHtml(band.label)} · ${band.points}</span>
                        <div style="height:12px;border-radius:999px;background:#e9eff9;overflow:hidden;">
                          <div style="height:100%;width:${band.count ? Math.max(6, Math.round(band.share * 100)) : 0}%;background:linear-gradient(90deg,var(--accent),#9fc0ff);border-radius:inherit;"></div>
                        </div>
                        <span class="subtle">${band.count}</span>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<div class="empty-state compact-empty"><h3>No analytics yet</h3><p>Once you save some grades, the criterion distributions will appear here automatically.</p></div>`}
        </div>
      </details>

      <div id="student-review-list" class="student-list">
        ${roster.length === 0 && submissions.length === 0
          ? `<div class="empty-state compact-empty"><h3>No students yet</h3><p>Invite students to this class using the ✉ Invite students button.</p></div>`
          : roster.map((member) => renderTeacherReviewSubmissionCard(
              member,
              submissions.find((submission) => submission.studentId === member.id)
            )).join("")
        }
      </div>
    </section>
  `;
  }

  function renderTeacherReviewSubmissionCard(member, submission) {
    const { escapeHtml, getPasteEvidenceItems, getSubmissionStatusDisplay } = globalThis.window;
    const { isSubmissionGraded } = globalThis.window.SubmissionUtils;
    if (!submission) {
      return `
        <div class="submission-card simple-card">
          <div class="card-top">
            <div>
              <h3 style="margin:0 0 4px;">${escapeHtml(member.name)}</h3>
              <span class="warning-pill">Not started</span>
            </div>
            <button class="button" data-action="inspect-submission" data-student-id="${member.id}" style="flex-shrink:0;">Grade →</button>
          </div>
        </div>
      `;
    }
    const events = Array.isArray(submission.writingEvents) ? submission.writingEvents : [];
    const finalText = submission.finalText || submission.draftText || "";
    const startedAt = submission.startedAt || submission.updatedAt || submission.submittedAt;
    const endedAt = submission.submittedAt || submission.updatedAt || startedAt;
    const totalMinutes = startedAt && endedAt
      ? Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000))
      : 0;
    const metrics = {
      largePasteCount: getPasteEvidenceItems(submission).length,
      finalWordCount: finalText.trim() ? finalText.trim().split(/\s+/).length : 0,
      revisionCount: events.length,
      totalMinutes,
    };
    const isGraded = isSubmissionGraded(submission);
    const score = submission.teacherReview?.finalScore;
    return `
      <div class="submission-card simple-card">
        <div class="card-top">
          <div style="flex:1;">
            <h3 style="margin:0 0 6px;">${escapeHtml(member.name)}</h3>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span class="status-pill">${escapeHtml(getSubmissionStatusDisplay(submission.status))}</span>
              ${isGraded ? `<span class="pill" style="color:var(--sage);border-color:var(--sage);">✓ Graded${score !== "" && score != null ? ` · ${escapeHtml(String(score))}` : ""}</span>` : ""}
              ${metrics.largePasteCount ? `<span class="warning-pill">⚠ Paste</span>` : ""}
            </div>
            <div class="pill-row" style="margin-top:6px;">
              <span class="pill">${metrics.finalWordCount} words</span>
              <span class="pill">${metrics.revisionCount} edits</span>
              <span class="pill">${metrics.totalMinutes} min</span>
            </div>
          </div>
          <button class="button" data-action="inspect-submission" data-student-id="${member.id}" data-submission-id="${submission.id}" style="flex-shrink:0;">Grade →</button>
        </div>
      </div>
    `;
  }

  function renderTeacherSubmissionStatusPanel(currentStatus, canReopenSubmission, deadlinePassed) {
    const { escapeHtml, getSubmissionStatusDisplay } = globalThis.window;
    return `
      <div style="margin-bottom:16px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fafaf8;">
        <p class="mini-label" style="margin-bottom:8px;">Submission status</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${["submitted", "late", "missing"].map((status) => {
            const isActive = currentStatus === status;
            const lateOrMissing = status !== "submitted";
            let background = "#fff";
            let borderColor = "var(--line)";
            let color = "var(--ink)";
            if (isActive) {
              background = lateOrMissing ? "#fde7e7" : "#dff3e4";
              borderColor = lateOrMissing ? "#c56b6b" : "#4f8f68";
              color = lateOrMissing ? "#8a2f2f" : "#1f5c38";
            }
            return `<button class="button-ghost" data-action="set-review-status" data-status="${status}" style="background:${background};border-color:${borderColor};color:${color};">${escapeHtml(getSubmissionStatusDisplay(status))}</button>`;
          }).join("")}
          ${canReopenSubmission ? `<button class="button-secondary" data-action="open-reopen-submission-modal">Reopen for student</button>` : `<span class="pill">In progress</span>`}
        </div>
        ${deadlinePassed ? `
          <p style="font-size:0.78rem;color:var(--muted);margin:8px 0 0;">Deadline has passed, so you can mark this student as late or missing.</p>
        ` : ""}
      </div>
    `;
  }

  // Annotation labels are stored as "Name: explanation". Split them so the
  // toolbar can show the full name (audit finding 3) with the explanation as a
  // tooltip — no storage migration needed.
  function annotationCodeParts(label) {
    const text = String(label || "Custom code");
    const splitAt = text.indexOf(":");
    const name = (splitAt >= 0 ? text.slice(0, splitAt) : text).trim() || "Custom code";
    const explanation = splitAt >= 0 ? text.slice(splitAt + 1).trim() : "";
    return { name, explanation };
  }

  function renderAnnotationToolbar() {
    const { escapeHtml, escapeAttribute } = globalThis.window;
    const { getErrorCodes, loadCustomErrorCodes } = globalThis.window.AppConstants;
    const customCodes = loadCustomErrorCodes();
    return `
      <div class="error-code-toolbar">
        <span class="mini-label" style="align-self:center;">Annotate · select text, then tap a code</span>
        ${getErrorCodes().map(({ code, label }) => `<button class="error-code-btn error-code-btn-labeled" data-action="add-annotation" data-code="${escapeAttribute(code)}" title="${escapeAttribute(label)}" onmousedown="event.preventDefault()"><span class="error-code-badge">${escapeHtml(code)}</span><span class="error-code-name">${escapeHtml(annotationCodeParts(label).name)}</span></button>`).join("")}
        <button class="error-code-btn error-code-btn-note" data-action="add-annotation" data-code="NOTE" title="Add a custom note" onmousedown="event.preventDefault()"><span aria-hidden="true">✎</span> Note</button>
        <button class="error-code-btn error-code-add-btn" data-action="add-custom-error-code" title="Add a reusable error code" aria-label="Add a reusable error code" onmousedown="event.preventDefault()">+</button>
      </div>
      ${customCodes.length ? `
        <div class="custom-code-manage">
          <span class="mini-label">Your codes:</span>
          ${customCodes.map((entry) => `
            <button class="custom-code-chip" data-action="remove-custom-error-code" data-code="${escapeAttribute(entry.code)}" title="Remove ${escapeAttribute(entry.code)}">
              <span class="error-code-badge">${escapeHtml(entry.code)}</span>
              <span>${escapeHtml(annotationCodeParts(entry.label).name)}</span>
              <span aria-hidden="true" class="custom-code-remove">✕</span>
            </button>
          `).join("")}
        </div>
      ` : ""}
    `;
  }

  function renderAnnotationList(submission) {
    const { escapeHtml, escapeAttribute, getAnnotationDisplayLabel } = globalThis.window;
    const { getErrorCodeLabel } = globalThis.window.AppConstants;
    const annotations = submission.teacherReview?.annotations || [];
    if (!annotations.length) {
      return `<p class="subtle" style="margin-top:12px;font-size:0.85rem;">No annotations yet. Select text above then choose a code.</p>`;
    }
    return `
      <div style="margin-top:12px;display:grid;gap:6px;">
        ${annotations.map((ann, i) => `
          <div id="comment-${escapeAttribute(ann.id)}" style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;border-radius:10px;background:#f6f0ff;border:1px solid #c9b3eb;font-size:0.88rem;scroll-margin-top:120px;">
            <strong style="color:#5b2a86;flex-shrink:0;">${escapeHtml(getAnnotationDisplayLabel(ann, i))}</strong>
            <button type="button" onclick="scrollToAnnotation('${escapeAttribute(ann.id)}')" style="flex:1;text-align:left;background:none;border:none;padding:0;color:#3f2a56;cursor:pointer;font:inherit;">
              "${escapeHtml(ann.selectedText)}"${getErrorCodeLabel(ann.code) ? ` — ${escapeHtml(getErrorCodeLabel(ann.code))}` : ""}${ann.note ? ` — ${escapeHtml(ann.note)}` : ""}
            </button>
            <button class="error-code-btn" data-action="remove-annotation" data-annotation-index="${i}" style="flex-shrink:0;color:var(--danger);">✕</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderGradingNav(assignment, submission, ctx) {
    const { escapeHtml, escapeAttribute, getSubmissionStatusDisplay } = globalThis.window;
    const { studentName, currentStatus, roster, rosterIndex, previousStudentId, nextStudentId } = ctx;
    return `
      <div class="review-nav">
        <button class="button-ghost" data-action="back-to-assignments" style="font-size:0.85rem;">← Assignments</button>
        <span style="color:var(--muted);font-size:0.85rem;">/</span>
        <button class="button-ghost" data-action="back-to-review" style="font-size:0.85rem;">${escapeHtml(assignment.title)}</button>
        <span style="color:var(--muted);font-size:0.85rem;">/</span>
        <span style="font-weight:600;font-size:0.95rem;">${escapeHtml(studentName)}</span>
        <button class="button-ghost" data-action="edit-class-member-name" data-student-id="${submission.studentId}" data-student-name="${escapeAttribute(studentName)}" style="font-size:0.78rem;min-height:30px;padding:0 10px;">Rename</button>
        <span class="status-pill">${escapeHtml(getSubmissionStatusDisplay(currentStatus))}</span>
        ${roster.length ? `<span style="font-size:0.82rem;color:var(--muted);">${rosterIndex + 1}/${roster.length}</span>` : ""}
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="button-ghost" data-action="previous-review-student" ${!previousStudentId ? "disabled" : ""} style="font-size:0.85rem;">← Previous student</button>
          <button class="button-ghost" data-action="next-review-student" ${!nextStudentId ? "disabled" : ""} style="font-size:0.85rem;">Next student →</button>
          <button class="button-ghost" data-action="download-work" style="font-size:0.85rem;">⬇ Grade sheet</button>
        </div>
      </div>
    `;
  }

  // Left pane: student text with the annotation toolbar pinned above it.
  function renderGradingTextPane(submission, ctx) {
    const { renderAnnotatedText } = globalThis.window;
    const { currentStatus } = ctx;
    const isUnsubmitted = !["submitted", "late", "missing", "graded"].includes(currentStatus)
      && (submission.finalText || submission.draftText);
    return `
      <div class="review-split-pane review-split-text">
        <div class="review-pane-head">
          <p class="mini-label" style="margin-bottom:8px;">Student text</p>
          ${renderAnnotationToolbar()}
        </div>
        <div class="review-pane-scroll">
          ${isUnsubmitted ? `
            <div style="margin-bottom:14px;padding:10px 14px;border:1px solid #d9c878;background:#fff9e6;border-radius:10px;font-size:0.9rem;color:#5a4a14;">
              <strong>In-progress draft.</strong> This student has not submitted yet, but you can still review and grade their current work. Annotations and scores will be saved as normal.
            </div>
          ` : ""}
          <div class="editor-with-lines review-editor-with-lines">
            <div class="line-gutter" id="student-text-annotate-gutter" aria-hidden="true"></div>
            <div id="student-text-annotate" data-line-gutter="student-text-annotate-gutter" onmouseup="captureAnnotationSelection()" onkeyup="captureAnnotationSelection()" ontouchend="captureAnnotationSelection()" style="background:#fafaf8;border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:0.92rem;line-height:1.85;white-space:pre-wrap;word-break:break-word;min-height:240px;cursor:text;">${renderAnnotatedText(submission)}</div>
          </div>
          ${renderAnnotationList(submission)}
        </div>
      </div>
    `;
  }

  // ── Compact pill rubric for the grading pane (mockup-faithful) ─────────────
  // Abbreviate a band label for the small pill ("Excellent" → "Exc.",
  // "Needs Improvement" → "NI"). The full label rides in the title tooltip and
  // the descriptor strip below, so nothing is lost.
  function gradingBandAbbrev(label) {
    const text = String(label || "").trim();
    if (!text) return "—";
    const known = {
      excellent: "Exc.", good: "Good", satisfactory: "Sat.", unsatisfactory: "Unsat.",
      "needs improvement": "Needs", proficient: "Prof.", developing: "Dev.",
      beginning: "Beg.", emerging: "Emrg.", weak: "Weak", fair: "Fair", poor: "Poor",
    };
    const lower = text.toLowerCase();
    if (known[lower]) return known[lower];
    const head = text.split(/\s+/)[0];
    if (head.length <= 6) return head;
    return `${head.slice(0, 5)}.`;
  }

  // 0.5-step scores can land on x.5; show whole numbers without a trailing ".0".
  function formatBandScore(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function normalizeGradingBand(band) {
    return {
      id: band.id || "",
      label: band.label || "",
      points: Number(band.points ?? band.score ?? 0),
      description: String(band.description || "").trim(),
    };
  }

  function isGradingBandMatch(entry, band) {
    if (!entry) return false;
    if (entry.bandId && band.id) return entry.bandId === band.id;
    return Number(entry.points) === band.points && entry.label === band.label;
  }

  function renderGradingRubricPill(criterionId, band, selected, suggested) {
    const { escapeHtml, escapeAttribute, levelTheme } = globalThis.window;
    const theme = levelTheme(band.label);
    const isSelected = isGradingBandMatch(selected, band);
    const isSuggested = !isSelected && isGradingBandMatch(suggested, band);
    // Soft tinted fill with a coloured border/text reads better than a saturated
    // solid block; suggested bands get the same tint with a dashed border.
    let style = "";
    if (isSelected) style = `background:${theme.bg};border-color:${theme.ring};color:${theme.text};`;
    else if (isSuggested) style = `border-style:dashed;border-color:${theme.ring};color:${theme.text};background:${theme.bg};`;
    const title = band.description
      ? `${band.label} · ${band.points} pts — ${band.description}`
      : `${band.label} · ${band.points} pts`;
    return `<button class="grading-pill${isSelected ? " is-selected" : ""}${isSuggested ? " is-suggested" : ""}" data-action="select-rubric-band" data-criterion-id="${escapeAttribute(criterionId)}" data-band-id="${escapeAttribute(band.id)}" title="${escapeAttribute(title)}" style="${style}"><span class="grading-pill-label">${escapeHtml(gradingBandAbbrev(band.label))}</span></button>`;
  }

  // A ±0.5 stepper sits on the criterion row and nudges only that row's selected
  // cell. Until a band is picked there is nothing to nudge, so we show the range.
  function renderGradingScoreStepper(criterionId, selectedScore, min, max) {
    const { escapeAttribute } = globalThis.window;
    if (selectedScore === null) {
      return `<span class="grading-criterion-range">${formatBandScore(min)}–${formatBandScore(max)} pts</span>`;
    }
    const atFloor = selectedScore <= 0;
    const atCeil = selectedScore >= max;
    return `
      <span class="grading-stepper">
        <button type="button" class="grading-step-btn" data-action="bump-rubric-band" data-criterion-id="${escapeAttribute(criterionId)}" data-direction="-1" ${atFloor ? "disabled" : ""} title="Lower by 0.5" aria-label="Lower score by 0.5">▼</button>
        <span class="grading-step-value">${formatBandScore(selectedScore)}</span>
        <button type="button" class="grading-step-btn" data-action="bump-rubric-band" data-criterion-id="${escapeAttribute(criterionId)}" data-direction="1" ${atCeil ? "disabled" : ""} title="Raise by 0.5" aria-label="Raise score by 0.5">▲</button>
      </span>
    `;
  }

  function renderGradingRubricCriterion(criterion, bands, selected, suggested) {
    const { escapeHtml, escapeAttribute, renderRichTextHtml } = globalThis.window;
    const points = bands.map((b) => b.points);
    const min = points.length ? Math.min(...points) : 0;
    const max = points.length ? Math.max(...points) : Number(criterion.points || criterion.maxScore || 0);
    const activeBand = selected ? bands.find((b) => isGradingBandMatch(selected, b)) : null;
    const suggestedBand = !activeBand && suggested ? bands.find((b) => isGradingBandMatch(suggested, b)) : null;
    const descBand = activeBand || suggestedBand;
    // The displayed score follows the selected entry — which may carry a ±0.5 fine
    // adjustment — rather than the band's nominal points.
    const selectedScore = activeBand ? Number(selected.points ?? activeBand.points) : null;
    let descHeader = "";
    if (activeBand) {
      descHeader = `${activeBand.label} · ${formatBandScore(selectedScore)} pts`;
    } else if (suggestedBand) {
      descHeader = `Suggested · ${suggestedBand.label} · ${formatBandScore(Number(suggested.points ?? suggestedBand.points))} pts`;
    }
    const pills = bands.map((band) => renderGradingRubricPill(criterion.id, band, selected, suggested)).join("");
    return `
      <div class="grading-criterion" data-rubric-criterion-id="${escapeAttribute(criterion.id)}">
        <div class="grading-criterion-title">
          <span class="grading-criterion-name">${escapeHtml(criterion.name || "Criterion")}</span>
          ${renderGradingScoreStepper(criterion.id, selectedScore, min, max)}
        </div>
        <div class="grading-score-pills">${pills}</div>
        ${descBand ? `<div class="grading-criterion-desc"><strong>${escapeHtml(descHeader)}</strong> ${renderRichTextHtml(descBand.description || "No descriptor provided.")}</div>` : ""}
      </div>
    `;
  }

  // Renders the rubric as compact pills and returns running totals. Criteria come
  // from reviewSummary.rubric (assignment.rubric) — the same source the
  // select-rubric-band handler looks up — so every pill click resolves, and
  // getCriterionBands carries the level descriptors for the strip below.
  function buildGradingRubricModel(ctx) {
    const { getCriterionBands } = globalThis.window.ReviewUtils;
    const { reviewSummary, suggestedRowScoreMap } = ctx;
    const criteria = reviewSummary.rubric;
    let total = 0;
    let graded = 0;
    let max = 0;
    const cards = criteria.map((criterion) => {
      const bands = getCriterionBands(criterion).map(normalizeGradingBand).sort((a, b) => b.points - a.points);
      max += bands.length ? Math.max(...bands.map((b) => b.points)) : Number(criterion.points || criterion.maxScore || 0);
      const selected = reviewSummary.rowScoreMap.get(criterion.id);
      const suggested = suggestedRowScoreMap.get(criterion.id);
      if (selected) {
        graded += 1;
        total += Number(selected.points || 0);
      }
      return renderGradingRubricCriterion(criterion, bands, selected, suggested);
    });
    return { html: cards.join(""), total, graded, max, count: criteria.length };
  }

  // A pending manual override wins; otherwise a saved score; otherwise the
  // auto-calculated rubric total. Guard clauses keep this free of nested or
  // negated-with-else conditionals.
  function resolveFinalScoreValue(ui, reviewScore, totalScore) {
    if (ui.pendingFinalScoreOverride !== null) return ui.pendingFinalScoreOverride;
    if (reviewScore !== "") return reviewScore;
    return totalScore;
  }

  function renderGradingScoreField(model, ctx, submission) {
    const { escapeAttribute } = globalThis.window;
    const { ui, reviewScore } = ctx;
    const hasManualOverride = typeof submission.teacherReview?.finalScore === "number"
      && submission.teacherReview.finalScore !== model.total;
    const fieldValue = resolveFinalScoreValue(ui, reviewScore, model.total);
    return `
      <div class="field grading-score-field">
        <label for="teacher-review-final-score">Final score (out of ${model.max})</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="number" id="teacher-review-final-score" step="0.5" min="0" max="${model.max}" value="${escapeAttribute(String(fieldValue))}" style="padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fafaf8;font-weight:700;font-size:1rem;width:96px;text-align:center;" />
          <span style="color:var(--muted);">/ ${model.max}</span>
          ${hasManualOverride ? `<span style="font-size:0.78rem;color:var(--muted);">Auto total: ${model.total}</span>` : ""}
        </div>
        <p style="font-size:0.76rem;color:var(--muted);margin-top:6px;">Edit to override the rubric total. Changing pills recalculates it.</p>
      </div>
    `;
  }

  // Right pane: rubric pills fill the pane; the score total + actions pin below.
  function renderGradingRubricPane(submission, ctx) {
    const { escapeHtml, formatDateTime, renderSuggestedGradePanel } = globalThis.window;
    const { ui } = ctx;
    const model = buildGradingRubricModel(ctx);
    const hasManualOverride = typeof submission.teacherReview?.finalScore === "number"
      && submission.teacherReview.finalScore !== model.total;
    const displayScore = hasManualOverride ? submission.teacherReview.finalScore : model.total;
    const alreadyGraded = Boolean(submission.teacherReview?.savedAt);
    const hasUnpublishedEdits = Boolean(globalThis.window.teacherReviewHasUnpublishedEdits?.(submission.teacherReview));
    const submittingLabel = alreadyGraded ? "Resubmitting…" : "Submitting…";
    const submitIdleLabel = alreadyGraded ? "Resubmit grade" : "Submit grade";
    const submitLabel = ui.gradeSubmitting ? submittingLabel : submitIdleLabel;
    const discardDisabled = ui.gradeSubmitting ? "disabled" : "";
    const discardButton = alreadyGraded && hasUnpublishedEdits
      ? `<button class="button-ghost" data-action="discard-teacher-review-edits" ${discardDisabled}>Discard changes</button>`
      : "";
    const savedSub = submission.teacherReview?.savedAt
      ? `✓ Saved ${escapeHtml(formatDateTime(submission.teacherReview.savedAt))}`
      : `${model.graded} of ${model.count} scored`;
    return `
      <div class="review-split-pane review-split-rubric">
        <div class="rubric-pane-head">
          <span class="rubric-pane-name">${escapeHtml(ctx.rubricName || "Rubric")}</span>
          <span class="rubric-pane-meta">${model.graded}/${model.count} criteria scored</span>
        </div>
        <div class="rubric-pane-body">
          <div class="grading-rubric">${model.html}</div>
          ${renderSuggestedGradePanel(submission)}
          ${renderGradingScoreField(model, ctx, submission)}
        </div>
        <div class="rubric-pane-foot">
          <div class="rubric-total">
            <div class="rubric-total-number"><span class="score-val">${displayScore}</span><span class="score-max"> / ${model.max}</span></div>
            <div class="rubric-total-sub">${savedSub}</div>
          </div>
          <div class="rubric-foot-actions">
            <button class="button-ghost" data-action="generate-grade" ${ui.gradeSuggestionLoading ? "disabled" : ""}>${ui.gradeSuggestionLoading ? "Suggesting…" : "Suggest"}</button>
            <button class="button-ghost" data-action="copy-lms-grade" title="Copies the score, rubric breakdown, teacher feedback and annotation comments so you can paste them into your LMS.">Copy</button>
            ${discardButton}
            <button class="button" data-action="save-teacher-review" ${ui.gradeSubmitting ? "disabled" : ""}>${submitLabel}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderPlaybackControls(playback, ui) {
    const { escapeHtml } = globalThis.window;
    const single = playback.frames.length <= 1;
    return `
      <div class="pill-row" style="margin-bottom:10px;">
        <button type="button" class="button-ghost" data-action="playback-step" data-direction="-1" ${single ? "disabled" : ""}>← Back</button>
        <button type="button" class="button-ghost" data-action="playback-toggle" ${single ? "disabled" : ""}>${ui.playback.isPlaying ? "Pause" : "Play"}</button>
        <button type="button" class="button-ghost" data-action="playback-step" data-direction="1" ${single ? "disabled" : ""}>Next →</button>
        <label class="subtle" style="display:flex;align-items:center;gap:8px;">Speed
          <select id="playback-speed">
            ${[0.5, 1, 1.5, 2, 3, 5, 8, 10, 15].map((speed) => `<option value="${speed}" ${Number(ui.playback.speed) === Number(speed) ? "selected" : ""}>${speed}×</option>`).join("")}
          </select>
        </label>
        <span id="playback-meta" class="pill">${escapeHtml(playback.timeLabel)}</span>
      </div>
      <input id="playback-slider" type="range" min="0" max="${Math.max(playback.frames.length - 1, 0)}" value="${playback.index}" style="width:100%;margin-bottom:10px;" ${single ? "disabled" : ""} />
      <div id="playback-label" class="subtle" style="margin-bottom:8px;">${escapeHtml(playback.label)}</div>
      <div id="playback-screen" style="background:#fafaf8;border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-height:180px;max-height:380px;overflow:auto;"><pre style="margin:0;white-space:pre-wrap;word-break:break-word;">${escapeHtml(playback.text)}</pre></div>
    `;
  }

  function renderCoachingChat(submission, studentName) {
    const { escapeHtml } = globalThis.window;
    return `
      <div style="max-height:240px;overflow-y:auto;display:grid;gap:6px;">
        ${(submission.chatHistory || []).map((m) => `
          <div style="padding:8px 12px;border-radius:8px;background:${m.role === "user" ? "#edf4ea" : "#f4efe6"};font-size:0.85rem;">
            <strong style="font-size:0.75rem;color:var(--muted);display:block;margin-bottom:2px;">${m.role === "user" ? escapeHtml(studentName) : "Coach"}</strong>
            ${escapeHtml(m.content)}
          </div>
        `).join("")}
      </div>
      <div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#f8fbff;border:1px solid var(--line);">
        <strong style="display:block;font-size:0.8rem;margin-bottom:4px;color:var(--muted);">Reflection — what I improved</strong>
        <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(submission.reflections?.improved || "No reflection written yet.")}</p>
      </div>
    `;
  }

  // Feedback for the student stays visible (full width — more room to write);
  // everything else below the split is a single click away.
  function renderGradingSecondary(assignment, submission, ctx) {
    const { escapeHtml, renderEmailDebugPanel, renderSubmissionBehaviourFlagPanel, renderWritingBehaviour,
      renderPasteEvidencePanel, renderWritingTimeNote, renderStudentAiFeedbackEvidence } = globalThis.window;
    const { ui, playback, studentName, reviewNotes } = ctx;
    const analytics = renderWritingBehaviour(submission, assignment);
    const flags = [
      renderSubmissionBehaviourFlagPanel(submission),
      renderPasteEvidencePanel(submission),
      renderWritingTimeNote(submission),
    ].join("");
    const studentMessageCount = (submission.chatHistory || []).filter((m) => m.role === "user").length;
    // One collapsible reveals writing behaviour and the replay side by side, so
    // the teacher opens both with a single click.
    const behaviourReplay = `
      <details class="review-secondary-section" ${ui.playback.touched ? "open" : ""}>
        <summary>Writing behaviour &amp; replay</summary>
        <div class="review-secondary-body">
          <div class="review-secondary-row">
            <div>${analytics || `<p class="subtle" style="margin:0;">No writing-behaviour data yet.</p>`}${flags}</div>
            <div>${renderPlaybackControls(playback, ui)}</div>
          </div>
        </div>
      </details>
    `;
    return `
      <div class="review-secondary">
        <div class="review-notes-block">
          <label for="teacher-review-notes" class="mini-label" style="display:block;margin-bottom:6px;">Feedback for student</label>
          <textarea id="teacher-review-notes" style="min-height:110px;width:100%;">${escapeHtml(reviewNotes)}</textarea>
        </div>
        ${renderEmailDebugPanel(assignment, submission)}
        ${behaviourReplay}
        <details class="review-secondary-section">
          <summary>Planning chat &amp; AI feedback used (${studentMessageCount} student messages)</summary>
          <div class="review-secondary-body">
            <div class="review-secondary-row">
              <div>${renderCoachingChat(submission, studentName)}</div>
              <div>${renderStudentAiFeedbackEvidence(submission) || `<p class="subtle" style="margin:0;">No AI feedback was used during writing.</p>`}</div>
            </div>
          </div>
        </details>
      </div>
    `;
  }

  function renderTeacherGrading(assignment, submission) {
    const { getUserById, isStudentSubmissionLocked, getReviewRoster,
      getPreviousReviewStudentId, getNextReviewStudentId, canMarkLateOrMissing,
      getPlaybackState } = globalThis.window;
    const { calculateTeacherReviewSummary, getTeacherReviewRowScoreMap } = globalThis.window.ReviewUtils;

    if (!submission) return `<div class="empty-state"><p>No submission selected.</p></div>`;

    const roster = getReviewRoster(assignment.id);
    const ctx = {
      ui: globalThis.window.AppState.ui,
      reviewSummary: calculateTeacherReviewSummary(assignment, submission),
      suggestedRowScoreMap: getTeacherReviewRowScoreMap(submission.teacherReview?.suggestedRowScores),
      reviewScore: submission.teacherReview?.finalScore ?? "",
      reviewNotes: submission.teacherReview?.finalNotes ?? "",
      studentName: submission._studentName || getUserById(submission.studentId)?.name || "Student",
      roster,
      rosterIndex: roster.findIndex((student) => student.id === submission.studentId),
      previousStudentId: getPreviousReviewStudentId(submission.studentId, assignment.id),
      nextStudentId: getNextReviewStudentId(submission.studentId, assignment.id),
      deadlinePassed: canMarkLateOrMissing(assignment),
      currentStatus: submission.status || submission.teacherReview?.status || "not_started",
      canReopenSubmission: isStudentSubmissionLocked(submission),
      rubricName: assignment.uploadedRubricName || assignment.title || "Rubric",
      playback: getPlaybackState(submission),
    };

    return `
      <section class="panel review-shell">
        ${renderGradingNav(assignment, submission, ctx)}
        ${renderTeacherSubmissionStatusPanel(ctx.currentStatus, ctx.canReopenSubmission, ctx.deadlinePassed)}
        <div class="review-split">
          ${renderGradingTextPane(submission, ctx)}
          ${renderGradingRubricPane(submission, ctx)}
        </div>
        ${renderGradingSecondary(assignment, submission, ctx)}
      </section>
    `;
  }

  const TeacherRender = {
    renderTeacherWorkspace,
    renderTeacherReview,
    renderTeacherGrading,
  };

  if (globalThis.window !== undefined) {
    globalThis.TeacherRender = TeacherRender;
    Object.assign(globalThis, TeacherRender);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TeacherRender;
  }
})();
