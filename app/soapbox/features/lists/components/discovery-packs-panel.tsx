import React from 'react';
import { FormattedMessage } from 'react-intl';

import api from 'soapbox/api';
import { Button, Spinner, Text } from 'soapbox/components/ui';
import { useAppSelector, useOwnAccount } from 'soapbox/hooks';
import {
  applyLoopsStarterKit,
  createMastodonCollection,
  fetchLoopsStarterKits,
  fetchMastodonCollections,
  fetchPixelfedStarterKits,
  supportsMastodonCollections,
} from 'soapbox/services/discovery-packs';

import type { DiscoveryPack } from 'soapbox/services/discovery-packs';

const softwareName = (instance: any): string => String(
  instance?.get?.('version') || instance?.version || '',
).split(/[-\s]/)[0].toLocaleLowerCase();

const DiscoveryPacksPanel: React.FC = () => {
  const state = useAppSelector((root) => root);
  const instance = useAppSelector((root) => root.instance);
  const account = useOwnAccount();
  const [packs, setPacks] = React.useState<DiscoveryPack[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const client = React.useMemo(() => api(() => state), [state]);
  const software = softwareName(instance);
  const mastodonCollections = supportsMastodonCollections(instance);

  const load = React.useCallback(async() => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      if (mastodonCollections) setPacks(await fetchMastodonCollections(client, account.id));
      else if (software.includes('loops')) setPacks(await fetchLoopsStarterKits(client));
      else if (software.includes('pixelfed')) setPacks(await fetchPixelfedStarterKits(client));
      else setPacks([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load collections');
    } finally {
      setLoading(false);
    }
  }, [account, client, mastodonCollections, software]);

  React.useEffect(() => {
    load();
  }, [load]);

  const createCollection = async(event: React.FormEvent) => {
    event.preventDefault();
    if (!mastodonCollections || !name.trim()) return;
    setBusyId('create');
    setError(null);
    try {
      const pack = await createMastodonCollection(client, { name, description, discoverable: true });
      setPacks((current) => [pack, ...current]);
      setName('');
      setDescription('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create collection');
    } finally {
      setBusyId(null);
    }
  };

  const applyKit = async(pack: DiscoveryPack) => {
    if (pack.provider !== 'loops') return;
    setBusyId(pack.id);
    setError(null);
    try {
      await applyLoopsStarterKit(client, pack.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to apply starter kit');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800' aria-labelledby='discovery-packs-heading'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 id='discovery-packs-heading' className='text-lg font-semibold text-gray-900 dark:text-white'>
            <FormattedMessage id='discovery_packs.heading' defaultMessage='Collections and starter kits' />
          </h2>
          <Text tag='p' size='sm' theme='muted'>
            <FormattedMessage id='discovery_packs.description' defaultMessage='Curated groups of accounts to help people discover communities without changing your private lists.' />
          </Text>
        </div>
        <Button theme='ghost' onClick={load} disabled={loading}>
          <FormattedMessage id='discovery_packs.refresh' defaultMessage='Refresh' />
        </Button>
      </div>

      {mastodonCollections && (
        <form className='mt-4 grid gap-2' onSubmit={createCollection}>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-200' htmlFor='collection-name'>
            <FormattedMessage id='discovery_packs.name' defaultMessage='Collection name' />
          </label>
          <input id='collection-name' className='rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-600' value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
          <label className='text-sm font-medium text-gray-700 dark:text-gray-200' htmlFor='collection-description'>
            <FormattedMessage id='discovery_packs.description_label' defaultMessage='Description' />
          </label>
          <textarea id='collection-description' className='min-h-[88px] rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-600' value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
          <div><Button type='submit' theme='primary' disabled={!name.trim() || busyId === 'create'}><FormattedMessage id='discovery_packs.create' defaultMessage='Create collection' /></Button></div>
        </form>
      )}

      {error && <Text tag='p' className='mt-3' theme='danger'>{error}</Text>}
      {loading ? <div className='py-6'><Spinner /></div> : (
        <div className='mt-4 grid gap-3'>
          {packs.length === 0 && (
            <Text theme='muted'><FormattedMessage id='discovery_packs.empty' defaultMessage='No collections or starter kits are available from this server.' /></Text>
          )}
          {packs.map((pack) => (
            <article key={`${pack.provider}:${pack.id}`} className='overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700'>
              <div className='p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <h3 className='truncate font-semibold text-gray-900 dark:text-white'>{pack.name}</h3>
                    <Text size='xs' theme='muted'>{pack.provider === 'mastodon' ? 'Mastodon Collection' : `${pack.provider} starter kit`} · {pack.itemCount} accounts</Text>
                  </div>
                  {pack.canApplyAll && <Button theme='primary' disabled={busyId === pack.id} onClick={() => applyKit(pack)}><FormattedMessage id='discovery_packs.apply' defaultMessage='Follow accounts' /></Button>}
                </div>
                {pack.description && <Text tag='p' className='mt-2'>{pack.description}</Text>}
                {pack.topic && <Text tag='p' size='sm' theme='muted' className='mt-2'>#{pack.topic}</Text>}
                {pack.url && <a href={pack.url} target='_blank' rel='noopener noreferrer' className='mt-3 inline-flex text-sm font-medium text-primary-600 hover:underline' onClick={(event) => event.stopPropagation()}><FormattedMessage id='discovery_packs.open' defaultMessage='Open collection' /></a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default DiscoveryPacksPanel;
