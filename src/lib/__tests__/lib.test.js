// Runs with Jest (npm test, CRA) — plain assertions, no extra dependency.
import { parseQuery, toSearchParams, removeFacet } from '../searchParser';
import { levelFor, formatPoints, signedPoints } from '../reputation';
import { qualityLevel, qualityChecklist, isUnrated } from '../quality';

describe('parseQuery', () => {
  test('exam réseau GI 2024', () => {
    const p = parseQuery('exam réseau GI 2024');
    expect(p.text).toBe('réseau GI');
    expect(p.docType).toBe('examen');
    expect(p.year).toBe('2024');
    expect(p.semester).toBeNull();
    expect(p.chips.map((c) => c.label)).toEqual(['Examen', '2024']);
  });
  test('corrigé td analyse s3', () => {
    const p = parseQuery('corrigé td analyse s3');
    expect(p).toMatchObject({ text: 'analyse', docType: 'corrige_td', semester: 'S3' });
  });
  test('correction alone = any corrigé', () => {
    expect(parseQuery('correction thermo').docType).toBe('corrige');
  });
  test('semestre 4 + academic year formats', () => {
    expect(parseQuery('proba semestre 4 2023/2024')).toMatchObject({ text: 'proba', semester: 'S4', year: '2024' });
    expect(parseQuery('algo 23/24').year).toBe('2024');
    expect(parseQuery('algo 2023-2024').year).toBe('2024');
  });
  test('does not eat module numbers or random words', () => {
    expect(parseQuery('analyse 2').text).toBe('analyse 2');
    expect(parseQuery('comptabilité générale 2').text).toBe('comptabilité générale 2');
    expect(parseQuery('base de données').docType).toBeNull();
  });
  test('cc2 / contrôle continu', () => {
    expect(parseQuery('cc2 electronique').docType).toBe('cc');
    expect(parseQuery('contrôle électronique').docType).toBe('cc');
  });
  test('first type wins, second stays in text', () => {
    expect(parseQuery('td cours python')).toMatchObject({ docType: 'td', text: 'cours python' });
  });
  test('empty', () => {
    expect(parseQuery('   ')).toMatchObject({ text: '', docType: null, chips: [] });
  });
  test('toSearchParams: explicit filters win', () => {
    const params = toSearchParams(parseQuery('exam réseau 2024'), { docType: 'td', universityId: 3 });
    expect(params).toMatchObject({ p_query: 'réseau', p_doc_type: 'td', p_year: '2024', p_university_id: 3, p_verified_only: false });
  });
  test('removeFacet keeps the rest', () => {
    expect(removeFacet('exam réseau GI 2024', 'year')).toBe('réseau GI examen');
    expect(parseQuery(removeFacet('exam réseau GI 2024', 'docType'))).toMatchObject({ docType: null, year: '2024' });
  });
});

describe('levels', () => {
  test('thresholds', () => {
    expect(levelFor(0).name).toBe('Nouveau');
    expect(levelFor(49).name).toBe('Nouveau');
    expect(levelFor(50).name).toBe('Contributeur');
    expect(levelFor(300).name).toBe('Expert');
    expect(levelFor(1000).name).toBe('Mentor');
    expect(levelFor(3500)).toMatchObject({ name: 'Légende du campus', next: null, progress: 1 });
  });
  test('progress to next', () => {
    expect(levelFor(175)).toMatchObject({ name: 'Contributeur', next: 300, toNext: 125, progress: 0.5 });
  });
  test('formatting', () => {
    expect(formatPoints(9955)).toBe('9\u2009955');
    expect(signedPoints(40)).toBe('+40');
    expect(signedPoints(-50)).toBe('−50');
  });
});

describe('quality', () => {
  const base = { status: 'published', quality_score: 54, quality_signals: { feedback_count: 0, rating_count: 0 } };
  test('unrated doc', () => {
    expect(isUnrated(base)).toBe(true);
    expect(qualityLevel(base).label).toBe('Pas encore évalué');
  });
  test('levels by score', () => {
    const d = (s) => ({ status: 'published', quality_score: s, quality_signals: { feedback_count: 3 } });
    expect(qualityLevel(d(92)).label).toBe('Excellent');
    expect(qualityLevel(d(72)).label).toBe('Bon');
    expect(qualityLevel(d(55)).label).toBe('Correct');
    expect(qualityLevel(d(30)).label).toBe('À vérifier');
    expect(qualityLevel({ ...d(90), status: 'rejected' }).label).toBe('Refusé');
  });
  test('checklist', () => {
    const doc = { status: 'verified', verification_source: 'community',
      quality_signals: { correct_module: 'yes', readable: 'yes', complete: 'no', recently_verified: true, verified_at: new Date().toISOString(), feedback_count: 6 } };
    const rows = qualityChecklist(doc);
    expect(rows.map((r) => r.state)).toEqual(['yes', 'yes', 'no', 'yes']);
    expect(rows[3].label).toBe("Vérifié par la communauté aujourd'hui");
  });
});
