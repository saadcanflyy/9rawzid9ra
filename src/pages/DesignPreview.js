import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wordmark, Button, Input, SearchBar, Chip, Tabs, Badge, DocType, Card, ModuleCard,
  DocumentRow, SchoolCard, StatStrip, Avatar, Navbar, Breadcrumb, EmptyState, Modal,
  Toast, Banner, Dropzone, PostCard, Messenger, Paywall, Skeleton, ThemeToggle,
  Select, Switch, Sheet, Dropdown, Pagination, LoadMore, ProgressBar,
} from '../design-system/ui';
import { useTheme } from '../design-system/theme';
import { notify } from '../design-system/toast';

const css = `
  .dp-page { max-width: 1040px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-16); display: flex; flex-direction: column; gap: var(--space-12); }
  .dp-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
  .dp-section { display: flex; flex-direction: column; gap: var(--space-4); }
  .dp-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
  .dp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }
  .dp-swatches { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  .dp-swatch { display: flex; flex-direction: column; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px; color: var(--text-subtle); }
  .dp-swatch span { width: 56px; height: 56px; border-radius: var(--radius-md); border: 1px solid var(--border); }
`;

const swatches = ['bg', 'surface', 'surface-2', 'surface-3', 'border', 'text', 'text-muted', 'brand', 'accent', 'success', 'warning', 'danger', 'founder'];

export default function DesignPreview() {
  const { mode, cycle } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [page, setPage] = useState(3);

  return (
    <div className="dp-page">
      <style>{css}</style>

      <div className="dp-head">
        <Wordmark size="lg" />
        <div className="dp-row">
          <Badge tone="warning">Dev only — /__design</Badge>
          <ThemeToggle mode={mode} onToggle={cycle} />
        </div>
      </div>

      <section className="dp-section">
        <h2 className="qz-h2">Tokens</h2>
        <div className="dp-swatches">
          {swatches.map((s) => (
            <div className="dp-swatch" key={s}><span style={{ background: `var(--${s})` }} />{s}</div>
          ))}
        </div>
        <div className="dp-row">
          <span className="t-display">Display</span>
          <span className="t-h1">H1</span>
          <span className="t-h2">H2</span>
          <span className="t-h3">H3</span>
          <span className="t-body">Body</span>
          <span className="t-mono">Mono</span>
          <span className="t-eyebrow">Eyebrow</span>
        </div>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Buttons</h2>
        <div className="dp-row">
          <Button variant="primary">Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-ghost">Danger ghost</Button>
          <Button variant="link">Lien</Button>
        </div>
        <div className="dp-row">
          <Button size="sm" icon="upload">Petit</Button>
          <Button size="md" icon="upload">Moyen</Button>
          <Button size="lg" icon="upload">Grand</Button>
          <Button iconOnly icon="search" aria-label="Rechercher" />
          <Button loading>Chargement</Button>
          <Button disabled>Désactivé</Button>
          <Button as={Link} to="/__design" icon="right" iconRight="right">Router Link</Button>
        </div>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Inputs</h2>
        <div className="dp-grid">
          <Input label="Nom du module" placeholder="Algorithmique S3" />
          <Input label="Description" multiline maxLength={200} counter hint="Visible par tous" />
          <Input label="Erreur" error="Ce champ est requis" />
          <Select label="Semestre" options={['S1', 'S2', 'S3', 'S4']} />
          <Switch label="Notifications par e-mail" checked={switchOn} onChange={(e) => setSwitchOn(e.target.checked)} />
        </div>
        <SearchBar placeholder="Module, filière ou école…" shortcut="/" />
        <Dropzone files={[{ name: 'examen-final-algo.pdf', ext: 'PDF', size: '2,1 Mo' }, { name: 'td3-structures.pdf', ext: 'PDF', progress: 64 }]} />
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Chips, tabs, badges, types</h2>
        <div className="dp-row">
          <Chip selected count={12}>Tous</Chip>
          <Chip count={4}>Examens</Chip>
          <Chip count={2}>Corrigés</Chip>
        </div>
        <Tabs label="Exemple" items={[{ id: 'a', label: 'Documents', count: 12 }, { id: 'b', label: 'Discussions', count: 3 }]} />
        <Tabs variant="pill" label="Exemple pill" items={[{ id: 'a', label: 'Récents' }, { id: 'b', label: 'Populaires' }]} />
        <div className="dp-row">
          <Badge tone="brand" icon="bookmark">Suivi</Badge>
          <Badge tone="success" icon="check">Vérifié</Badge>
          <Badge tone="warning">En attente</Badge>
          <Badge tone="danger">Signalé</Badge>
          <Badge tone="founder" icon="star">Fondateur</Badge>
        </div>
        <div className="dp-row">
          <DocType type="examen" /><DocType type="cc" /><DocType type="td" /><DocType type="tp" /><DocType type="cours" /><DocType type="corrige_examen" />
          <DocType type="examen" size="lg" /><DocType type="corrige_td" size="lg" />
        </div>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Cards</h2>
        <div className="dp-grid">
          <ModuleCard name="Algorithmique et structures de données" filiere="GI · S3" semester={3} school="EMSI" docs={24} completeness={70} types={['examen', 'td', 'corrige_examen']} bookmarked />
          <SchoolCard abbr="EMSI" name="École Marocaine des Sciences de l'Ingénieur" city="Casablanca" kind="Privé" filieres={12} docs={480} />
          <Card><p className="qz-h3">Carte simple</p><p className="qz-muted">Contenu libre dans une Card.</p></Card>
        </div>
        <StatStrip items={[{ value: '128', label: 'Universités', delta: '+3 cette semaine' }, { value: '9 955', label: 'Documents' }, { value: '312', label: 'En ligne' }]} />
        <div className="qz-list">
          <DocumentRow type="examen" title="Examen final — Algorithmique" year="2024/25" professor="Pr. Bennani" pages={6} downloads={128} verified />
          <DocumentRow type="corrige_td" title="Corrigé TD 3 — Structures de données" year="2023/24" pages={3} downloads={54} />
        </div>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Feedback</h2>
        <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'EMSI', href: '/browse' }, { label: 'Algorithmique' }]} />
        <Banner>Info : ce module vient d'être mis à jour.</Banner>
        <Banner tone="warning">Attention : document en attente de vérification.</Banner>
        <Banner tone="danger">Erreur : le fichier n'a pas pu être envoyé.</Banner>
        <div className="dp-row">
          <Toast title="Document envoyé">Merci pour ta contribution !</Toast>
          <Toast tone="error" title="Échec de l'envoi" />
          <Toast tone="info" title="Nouvelle notification" />
        </div>
        <div className="dp-row">
          <Button onClick={() => notify.success('Document envoyé', 'Merci pour ta contribution !')}>Toast succès</Button>
          <Button onClick={() => notify.error('Échec de l’envoi')}>Toast erreur</Button>
          <Button onClick={() => notify.info('Nouvelle notification')}>Toast info</Button>
        </div>
        <ProgressBar value={62} />
        <EmptyState icon="inbox" title="Aucun document pour l'instant">Sois le premier à partager une ressource.</EmptyState>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Overlays</h2>
        <div className="dp-row">
          <Button onClick={() => setModalOpen(true)}>Ouvrir une Modal</Button>
          <Button onClick={() => setSheetOpen(true)}>Ouvrir un Sheet</Button>
        </div>
        {modalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <Modal title="Confirmer la suppression" onClose={() => setModalOpen(false)}>
              Cette action est définitive. Veux-tu continuer ?
            </Modal>
          </div>
        )}
        {sheetOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <Sheet title="Filtrer" onClose={() => setSheetOpen(false)}>
              <p className="qz-muted">Contenu du sheet — filtres, options, etc.</p>
            </Sheet>
          </div>
        )}
        <Dropdown items={[{ label: 'Modifier', icon: 'file' }, { label: 'Télécharger', icon: 'download' }, { divider: true }, { label: 'Supprimer', icon: 'trash' }]} />
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Pagination</h2>
        <Pagination page={page} pages={8} onChange={setPage} />
        <LoadMore label="Charger plus de documents" />
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Social & extras</h2>
        <div className="dp-row">
          <Avatar name="Saad Amrani" online founder />
          <Avatar name="Yasmine Idrissi" size="lg" />
          <Avatar name="Anonyme" size="sm" />
        </div>
        <PostCard author="Saad Amrani" founder ago="2h" score={14} tags={['algo', 'S3']} replies={4}>
          Quelqu'un a le corrigé du TD 4 d'algo ? Je bloque sur la question 3.
        </PostCard>
        <div style={{ height: 360 }}>
          <Messenger name="Yasmine Idrissi" messages={[{ text: 'Salut ! Tu as le cours de la semaine dernière ?', time: '14:02' }, { text: 'Oui je te l’envoie', me: true, time: '14:05' }]} />
        </div>
        <Paywall features={['Corrections personnalisées', 'Plan de révision', 'Suivi de progression']} />
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Skeletons</h2>
        <div className="dp-row" style={{ width: '100%' }}>
          <Skeleton width={40} height={40} round />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={12} width="90%" />
          </div>
        </div>
      </section>

      <section className="dp-section">
        <h2 className="qz-h2">Navbar (isolé)</h2>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <Navbar user="Saad Amrani" unread={2} founder current="/browse" linkAs={Link} themeMode={mode} onToggleTheme={cycle} mobileMenu={<Button iconOnly icon="menu" variant="ghost" aria-label="Menu" />} />
        </div>
      </section>
    </div>
  );
}
