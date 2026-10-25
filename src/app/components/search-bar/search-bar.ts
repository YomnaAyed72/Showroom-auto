import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Auto } from '../../interfaces/auto';

// Une ligne du panier : une voiture et sa quantité
interface CartItem {
  auto: Auto;
  qty: number;
}

@Component({
  selector: 'app-search-bar',
  imports: [FaIconComponent],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  faMagnifyingGlass = faMagnifyingGlass;

  @Input() autos: Auto[] = [];
@Output() onSelectCar = new EventEmitter<Auto>();

  // ---------- Filtres ----------
  brand = signal('');
  maxPrice = signal<number | null>(null);
  minPower = signal(0);
  inStockOnly = signal(false);
  sortBy = signal('none');

  // ---------- Panier ----------
  cart = signal<CartItem[]>([]);     // ce qui est dans le panier
  orders = signal<CartItem[]>([]);   // ce qui a déjà été commandé
  cartOpen = signal(false);
  orderMessage = signal('');

  // ---------- Favoris (relus depuis le navigateur au démarrage) ----------
  favorites = signal<number[]>(JSON.parse(localStorage.getItem('favorites') ?? '[]'));

  // ---------- Comparateur ----------
  compareIds = signal<number[]>([]);

  // Cherche la quantité d'une voiture dans une liste
  qtyOf(list: CartItem[], id: number): number {
    const item = list.find(i => i.auto.id === id);
    return item ? item.qty : 0;
  }

  // Stock restant = stock de départ - commandé - dans le panier
  remaining(auto: Auto): number {
    return auto.availability - this.qtyOf(this.cart(), auto.id) - this.qtyOf(this.orders(), auto.id);
  }

  // Liste des marques (sans doublons) pour les boutons
  brands = computed(() => {
    const list: string[] = [];
    for (const a of this.autos) {
      if (!list.includes(a.brand)) {
        list.push(a.brand);
      }
    }
    return list;
  });

  // Liste filtrée et triée : se recalcule quand un signal change
  selectedAutos = computed(() => {
    const brand = this.brand().toLowerCase();
    const max = this.maxPrice();
    const min = this.minPower();
    const stockOnly = this.inStockOnly();

    const list = this.autos.filter(a =>
      a.brand.toLowerCase().includes(brand) &&
      (max === null || a.price <= max) &&
      a.power >= min &&
      (!stockOnly || this.remaining(a) > 0)
    );

    if (this.sortBy() === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.sortBy() === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.sortBy() === 'power-desc') {
      list.sort((a, b) => b.power - a.power);
    }
    return list;
  });

  comparedAutos = computed(() =>
    this.autos.filter(a => this.compareIds().includes(a.id))
  );
  cartCount = computed(() => {
     let n = 0;
  for (const item of this.cart()) {
      n += item.qty;
    }
    return n;
  });

   

  cartTotal = computed(() => {
    let total = 0;
    for (const item of this.cart()) {
      total += item.qty * item.auto.price;
    }
    return total;
  });

  // ---------- Filtres ----------
  selectAutos(value: string) { this.brand.set(value); }
  setMaxPrice(value: string) { this.maxPrice.set(value === '' ? null : +value); }
  setMinPower(value: string) { this.minPower.set(value === '' ? 0 : +value); }
  setInStock(checked: boolean) { this.inStockOnly.set(checked); }
  setSort(value: string) { this.sortBy.set(value); }

  resetFilters() {
    this.brand.set('');
    this.maxPrice.set(null);
    this.minPower.set(0);
    this.inStockOnly.set(false);
    this.sortBy.set('none');
  }

  // ---------- See more : on envoie la voiture au parent ----------
  selectCar(auto: Auto) {
    this.onSelectCar.emit(auto);
  }

  // ---------- Panier ----------
  addToCart(auto: Auto) {
    if (this.remaining(auto) <= 0) {
      return;
    }
    const list = this.cart().slice();            // copie du tableau
    const item = list.find(i => i.auto.id === auto.id);
    if (item) {
      item.qty++;
    } else {
      list.push({ auto: auto, qty: 1 });
    }
    this.cart.set(list);
    this.orderMessage.set('');
  }

  decrease(auto: Auto) {
    const list = this.cart().slice();
    const item = list.find(i => i.auto.id === auto.id);
    if (item) {
      item.qty--;
    }
    this.cart.set(list.filter(i => i.qty > 0));  // on retire les lignes à 0
  }

  removeFromCart(auto: Auto) {
    this.cart.set(this.cart().filter(i => i.auto.id !== auto.id));
  }

  clearCart() {
    this.cart.set([]);
  }

  confirmOrder() {
    const list = this.orders().slice();
    for (const item of this.cart()) {
      const existing = list.find(o => o.auto.id === item.auto.id);
      if (existing) {
        existing.qty += item.qty;
      } else {
        list.push({ auto: item.auto, qty: item.qty });
      }
    }
    this.orders.set(list);
    this.cart.set([]);
    this.orderMessage.set('Thank you! Your order has been confirmed.');
  }

  // ---------- Favoris ----------
  isFavorite(id: number): boolean {
    return this.favorites().includes(id);
  }

  toggleFavorite(id: number) {
    const list = this.favorites().slice();
    const pos = list.indexOf(id);
    if (pos >= 0) {
      list.splice(pos, 1);   // déjà favori : on le retire
    } else {
      list.push(id);
    }
    this.favorites.set(list);

    // sauvegarde dans le navigateur
    localStorage.setItem('favorites', JSON.stringify(list));
  }

  // ---------- Comparateur ----------
  isCompared(id: number): boolean {
    return this.compareIds().includes(id);
  }

  toggleCompare(id: number) {
    const list = this.compareIds().slice();
    const pos = list.indexOf(id);
    if (pos >= 0) {
      list.splice(pos, 1);
    } else {
      list.push(id);
      if (list.length > 2) {
        list.shift();      // on garde seulement les 2 dernières
      }
    }
    this.compareIds.set(list);
  }

  clearCompare() {
    this.compareIds.set([]);
  }
}