// Category definitions and dynamic form fields

export const CATEGORIES = [
  { id: 'id', label: 'ID / Card' },
  { id: 'keys', label: 'Keys' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'phone', label: 'Phone' },
  { id: 'bottle', label: 'Water Bottle' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'bag', label: 'Bag' },
  { id: 'watch', label: 'Watch' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'other', label: 'Other' },
];

export function getCategoryFields(categoryId) {
  const fields = {
    id: [
      { name: 'id_type', label: 'ID Type', placeholder: 'e.g., Student ID, Driver\'s License', required: true },
      { name: 'id_number', label: 'ID Number', placeholder: 'Last 4 digits or partial', required: false },
      { name: 'holder_name', label: 'Name on ID', placeholder: 'Full name', required: false },
    ],
    keys: [
      { name: 'key_type', label: 'Key Type', placeholder: 'e.g., Car keys, House keys', required: true },
      { name: 'keychain', label: 'Keychain Description', placeholder: 'Color, brand, attachments', required: false },
      { name: 'number_of_keys', label: 'Number of Keys', placeholder: 'Approximate count', required: false },
    ],
    laptop: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., Dell, HP, MacBook', required: true },
      { name: 'model', label: 'Model', placeholder: 'e.g., Inspiron 15, MacBook Pro', required: false },
      { name: 'color', label: 'Color', placeholder: 'e.g., Silver, Black', required: false },
      { name: 'serial_number', label: 'Serial Number', placeholder: 'Last 4 digits (optional)', required: false },
    ],
    phone: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., iPhone, Samsung, Xiaomi', required: true },
      { name: 'model', label: 'Model', placeholder: 'e.g., iPhone 13, Galaxy S21', required: false },
      { name: 'color', label: 'Color', placeholder: 'e.g., Black, Blue', required: false },
      { name: 'case_description', label: 'Phone Case', placeholder: 'Color, design, material', required: false },
    ],
    bottle: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., Hydro Flask, Tupperware', required: false },
      { name: 'color', label: 'Color', placeholder: 'e.g., Blue, Stainless steel', required: true },
      { name: 'size', label: 'Size', placeholder: 'e.g., 500ml, 1L', required: false },
      { name: 'stickers', label: 'Stickers/Markings', placeholder: 'Any unique identifiers', required: false },
    ],
    wallet: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., Leather, Generic', required: false },
      { name: 'color', label: 'Color', placeholder: 'e.g., Brown, Black', required: true },
      { name: 'material', label: 'Material', placeholder: 'e.g., Leather, Fabric', required: false },
      { name: 'contents', label: 'Contents', placeholder: 'Cards, cash, etc. (don\'t specify amounts)', required: false },
    ],
    bag: [
      { name: 'bag_type', label: 'Bag Type', placeholder: 'e.g., Backpack, Tote, Messenger', required: true },
      { name: 'brand', label: 'Brand', placeholder: 'e.g., JanSport, Nike', required: false },
      { name: 'color', label: 'Color', placeholder: 'e.g., Black, Navy blue', required: true },
      { name: 'size', label: 'Size', placeholder: 'e.g., Small, Large', required: false },
    ],
    watch: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., Casio, Apple Watch', required: false },
      { name: 'type', label: 'Type', placeholder: 'e.g., Digital, Analog, Smart', required: true },
      { name: 'color', label: 'Color/Band', placeholder: 'Watch and band color', required: true },
      { name: 'features', label: 'Features', placeholder: 'e.g., Metal band, leather strap', required: false },
    ],
    headphones: [
      { name: 'brand', label: 'Brand', placeholder: 'e.g., Sony, Apple AirPods', required: false },
      { name: 'type', label: 'Type', placeholder: 'e.g., Earbuds, Over-ear', required: true },
      { name: 'color', label: 'Color', placeholder: 'e.g., White, Black', required: true },
      { name: 'case_included', label: 'Case Included', placeholder: 'Yes/No, case description', required: false },
    ],
    other: [
      { name: 'item_type', label: 'Item Type', placeholder: 'What is it?', required: true },
      { name: 'color', label: 'Color', placeholder: 'Primary color', required: false },
      { name: 'brand', label: 'Brand/Make', placeholder: 'If applicable', required: false },
    ],
  };

  return fields[categoryId] || fields.other;
}
