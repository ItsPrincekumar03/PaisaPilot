export default function CategoryFilter({
  id = 'filter-category',
  categories = [],
  value,
  onChange,
}) {
  const hasCategories = categories.length > 0;
  const incomeCategories = categories.filter((category) => category.type === 'income');
  const expenseCategories = categories.filter((category) => category.type === 'expense');

  return (
    <div className="transaction-field">
      <label htmlFor={id}>Category</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">
          {hasCategories ? 'All categories' : 'No categories available'}
        </option>
        {incomeCategories.length > 0 && (
          <optgroup label="Income">
            {incomeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
        {expenseCategories.length > 0 && (
          <optgroup label="Expense">
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
