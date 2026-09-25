import { professorNameParts, isUsableProfessorName, searchNorm } from '../professorName';
import { levelFor, BADGES } from '../reputation';
import { displayStatus, qualityChecklist, scoreLabel } from '../quality';
import { contextToFilters, dropChip, toSearchParams, parseQuery } from '../searchParser';

describe('professorNameParts (mirror of SQL professor_name_parts)', () => {
  test.each([
    ['Nada SBIHI', 'Pr. Nada SBIHI', 'sbihi'],
    ['IBRAHIM RAHHAL', 'Pr. Ibrahim RAHHAL', 'rahhal'],
    ['Ibrahim RAHHAL', 'Pr. Ibrahim RAHHAL', 'rahhal'],
    ['Dr. Kaoutar Aalilouch', 'Pr. Kaoutar AALILOUCH', 'aalilouch'],
    ['Pr. Ahmed Bn Ali', 'Pr. Ahmed BN ALI', 'benali'],
    ['prof ahmed benali', 'Pr. Ahmed BENALI', 'benali'],
    ['A BENALI', 'Pr. A. BENALI', 'benali'],
    ['Mme. Fatima-Zahra EL IDRISSI', 'Pr. Fatima Zahra EL IDRISSI', 'elidrissi'],
  ])('%s → %s', (raw, display, key) => {
    const p = professorNameParts(raw);
    expect(p.displayName).toBe(display);
    expect(p.nameKey).toBe(key);
  });
  test('titles only is not a name', () => {
    expect(professorNameParts('PR').nameKey).toBeNull();
    expect(isUsableProfessorName('PR')).toBe(false);
    expect(isUsableProfessorName('Youssef GAHI')).toBe(true);
  });
  test('searchNorm maps roman numerals and accents', () => {
    expect(searchNorm('Analyse II — Équations')).toBe('analyse 2 equations');
  });
});

describe('reputation v2', () => {
  test('level thresholds 0/50/250/750/2500', () => {
    expect([0, 50, 250, 750, 2500].map((p) => levelFor(p).level)).toEqual([1, 2, 3, 4, 5]);
    expect(levelFor(249).name).toBe('Contributeur');
    expect(levelFor(2499).nextName).toBe('Légende du campus');
  });
  test('requested badges exist', () => {
    const codes = BADGES.map((b) => b.code);
    ['first_upload', 'downloads_100', 'quality_contributor', 'community_helper', 'top_university_contributor']
      .forEach((c) => expect(codes).toContain(c));
  });
});

describe('quality v2', () => {
  test('display statuses', () => {
    expect(displayStatus({ display_status: 'community_approved' }).label).toBe('Approuvé par la communauté');
    expect(displayStatus({ status: 'published' }).label).toBe('En attente');
    expect(displayStatus({ status: 'verified' }).label).toBe('Vérifié');
    expect(displayStatus({ status: 'rejected' }).key).toBe('rejected');
  });
  test('checklist includes the university criterion', () => {
    const rows = qualityChecklist({ quality_signals: { correct_university: 'yes' } });
    expect(rows.find((r) => r.key === 'correct_university')).toMatchObject({ state: 'yes', label: 'Bonne école' });
  });
  test('score label', () => {
    expect(scoreLabel({ quality_score: 92, quality_signals: { feedback_count: 5 } })).toBe('92/100');
    expect(scoreLabel({ quality_score: 50, quality_signals: {} })).toBeNull();
  });
});

describe('search v2 context', () => {
  const ctx = {
    university: { id: 1, name: 'Université Mohammed V' }, faculty: { id: 4, name: 'Faculté des Sciences' },
    filiere: { id: 9, name: 'Sciences Mathématiques et Informatique', abbreviation: 'SMI' }, semester: 'S3',
    module: { id: 77, name: 'Analyse 2' }, doc_types: ['examen', 'corrige_examen'], remaining: 'analyse 2',
  };
  test('confident context becomes filters and chips', () => {
    const r = contextToFilters(ctx);
    expect(r.filters).toMatchObject({ universityId: 1, facultyId: 4, filiereId: 9, semester: 'S3', moduleId: 77 });
    expect(r.chips.map((c) => c.label)).toEqual(['Université Mohammed V', 'Faculté des Sciences', 'SMI', 'S3', 'Analyse 2', 'Examen', 'Corrigé examen']);
    expect(r.text).toBe('');
    const p = toSearchParams(parseQuery(''), r.filters);
    expect(p).toMatchObject({ p_module_id: 77, p_doc_types: ['examen', 'corrige_examen'], p_filiere_id: 9 });
  });
  test('without a confident module, candidates are offered', () => {
    const r = contextToFilters({ remaining: 'analyse', module_candidates: [{ id: 1 }, { id: 2 }] });
    expect(r.text).toBe('analyse');
    expect(r.candidates).toHaveLength(2);
  });
  test('dropChip', () => {
    const f = dropChip({ moduleId: 77, docTypes: ['examen', 'td'] }, 'docType:examen');
    expect(f.docTypes).toEqual(['td']);
    expect(dropChip(f, 'moduleId').moduleId).toBeUndefined();
    expect(dropChip({ docTypes: ['td'] }, 'docType:td').docTypes).toBeUndefined();
  });
});
