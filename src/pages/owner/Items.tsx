import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatRupiah, parseRupiahInput } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function Items() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Item[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, price }: { name: string; price: number }) => {
      const { error } = await supabase.from('items').insert({ name: name.trim(), price });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsAddOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      toast.success('Item berhasil ditambahkan');
    },
    onError: () => {
      toast.error('Gagal menambahkan item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, price }: { id: string; name: string; price: number }) => {
      const { error } = await supabase
        .from('items')
        .update({ name: name.trim(), price })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setEditItem(null);
      setEditItemName('');
      setEditItemPrice('');
      toast.success('Item berhasil diperbarui');
    },
    onError: () => {
      toast.error('Gagal memperbarui item');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('items')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: () => {
      toast.error('Gagal mengubah status item');
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast.error('Nama item tidak boleh kosong');
      return;
    }
    const price = parseRupiahInput(newItemPrice);
    addMutation.mutate({ name: newItemName, price });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editItemName.trim()) {
      toast.error('Nama item tidak boleh kosong');
      return;
    }
    const price = parseRupiahInput(editItemPrice);
    updateMutation.mutate({ id: editItem.id, name: editItemName, price });
  };

  const openEditDialog = (item: Item) => {
    setEditItem(item);
    setEditItemName(item.name);
    setEditItemPrice(item.price.toString());
  };

  const activeItems = items.filter((i) => i.is_active);
  const inactiveItems = items.filter((i) => !i.is_active);

  return (
    <OwnerLayout title="Master Item">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {activeItems.length} aktif, {inactiveItems.length} nonaktif
          </p>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Tambah
          </Button>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Belum ada item</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Tambah item pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Card
                key={item.id}
                className={!item.is_active ? 'opacity-60' : ''}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className={cn('block truncate', !item.is_active && 'line-through')}>
                        {item.name}
                      </span>
                      <span className="text-sm text-primary font-medium">
                        {formatRupiah(item.price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: item.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Item Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Item</Label>
                <Input
                  id="name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Contoh: Es Teh Manis"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Harga Jual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                  <Input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama Item</Label>
                <Input
                  id="edit-name"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Harga Jual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                  <Input
                    id="edit-price"
                    type="text"
                    inputMode="numeric"
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditItem(null)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
