import { useState } from 'react';
import { GroupList } from './pages/GroupList';
import { GroupDetail } from './pages/GroupDetail';
import { PostSetList } from './pages/PostSetList';

type Page =
  | { name: 'groups' }
  | { name: 'group-detail'; groupId: number }
  | { name: 'post-sets' };

export function App() {
  const initialPage = snapbatonData.page;
  const [page, setPage] = useState<Page>(
    initialPage === 'snapbaton-post-sets'
      ? { name: 'post-sets' }
      : { name: 'groups' }
  );

  switch (page.name) {
    case 'groups':
      return (
        <GroupList
          onSelectGroup={(id) => setPage({ name: 'group-detail', groupId: id })}
        />
      );
    case 'group-detail':
      return (
        <GroupDetail
          groupId={page.groupId}
          onBack={() => setPage({ name: 'groups' })}
        />
      );
    case 'post-sets':
      return <PostSetList />;
  }
}
