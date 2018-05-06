# Outliner

*Let's write an outlining tool.* It's basically a piece of software which helps in dealing with lists inside lists inside lists.

Let's try formulating a specification by defining the meaning of a few words:
- an *outline* is an ordered list of items ;
- an *item* is a title, a note, and an outline ;
- a *title* is a single line of text ;
- a *note* is multiple lines of text.

But let's refine our understanding of the concepts by taking the item as the core of the system instead of the outline.

Let's rewrite this specification with that angle in mind:
- an *item* is a title, a note, and ordered subitems ;
- an *outline* is an item.

## The bare minimum

Let's start our adventure by focusing on the concept of an *item*. What can you do with an item? Is CRUD enough? We'll see.

### Creating an item

What do we need to create an item?

An item never lives on its own, except the first one at the root of the outline.

```ts
Reducer.define(
    /Item (.+) is a new outline/,
    ({ item_id }) => {
        assert(!Item.exists(item_id))
        Item.create(item_id)
        assert(Item.exists(item_id))
    }
)
```

Most of the time, an item is near other items.

```ts
Reducer.define(
    /Item (.+) is inside item (.+) at position (.+)/,
    ({ new_item_id, parent_item_id, position }) => {
        assert(Item.exists(parent_item_id))
        assert(!Item.exists(new_item_id))
        Item.create(new_item_id)
        Item.update(parent_item_id, parent_item => ({
            ...parent_item,
            subitems: {
                ...parent_item.subitems,
                [position]: new_item_id
            }
        }))
        assert(Item.exists(new_item_id))
        assert(new_item_id in Item.get(parent_item_id).subitems)
    }
)
```

We now have our basis covered, since we can define a hierarchy with only theses facts.

To make this code work, we need a few utilities.

First, utilities related to the items.

```ts
type Id = string
interface Item {
    id: Id,
    subitems: { [position: string]: Id },
    title: string
}
namespace Item {
    const items: { [id: string]: Item } = {}
    export function exists(id: Id) { return id in items }
    export function create(id: Id) { items[id] = { id, subitems: {}, title: "" } }
    export function get(id: Id) { return items[id] }
    export function update(id: Id, patch: (item: Item) => Item) { items[id] = patch(items[id]) }
}
```

Second, utilities related to the definition of the functions.

```ts
interface Input { [key: string]: string }
type Reducer = (input: Input) => void
namespace Reducer {
    const reducers: Map<RegExp, Reducer> = new Map()
    export function define(regex: RegExp, reducer: Reducer) { reducers.set(regex, reducer) }
}
```

### Changing the title of an item

The main feature of an outliner is the ability to edit any item's title.

```ts
Reducer.define(
    /Item (.+)'s title is (".+")/,
    ({ item_id, encoded_title }) => {
        assert(Item.exists(item_id))
        const title = JSON.parse(encoded_title)
        assert(typeof title === "string")
        Item.update(item_id, item => ({
            ...item,
            title
        }))
        assert(Item.get(item_id).title === title)
    }
)
```
