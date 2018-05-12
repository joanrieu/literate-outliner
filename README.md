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

```ts
type Id = string
interface Item {
    id: Id,
    parent_id: Id,
    subitems: Id[],
    title: string,
    note: string
}
```

## The bare minimum

Let's start our adventure by focusing on the concept of an *item*.

### CRUD

What can you do with an item? Let's start by implementing some CRUD-style functions for the item collection.

```ts
namespace Item {
    const items: { [id: string]: Item } = {}
    export function exists(id: Id) { return id in items }
    export function create(id: Id, parent_id?: Id) { items[id] = { id, parent_id, subitems: [], title: "", note: "" } }
    export function get(id: Id) { return items[id] }
    export function update(id: Id, patch: (item: Item) => Item) { items[id] = patch(items[id]) }
    export function del(id: Id) { delete items[id] }
}
```

### Handling changes

We would like to implement changes to the model not by acessing it directly, but instead by implementing fact handlers, akin to event handlers.

```ts
import assert = require("assert")
type Reducer = (input: string[]) => void
namespace Reducer {
    const reducers: Map<RegExp, Reducer> = new Map()
    export function define(regex: RegExp, reducer: Reducer) { reducers.set(regex, reducer) }
}
```

Usually, events are sentences written in the past tense, but it made more sense to the author to use the present tense in this writing, which is why we'll call them facts instead of events.

### Creating an item

What do we need to create an item?

An item never lives on its own, except the first one at the root of the outline.

```ts
Reducer.define(
    /Outline (.+) was created/,
    ([ item_id ]) => {
        assert(!Item.exists(item_id))
        Item.create(item_id)
        assert(Item.exists(item_id))
    }
)
```

Most of the time, an item is near other items.

```ts
Reducer.define(
    /Item (.+) was created inside item (.+) at position (.+)/,
    ([ new_item_id, parent_item_id, position_str ]) => {
        assert(Item.exists(parent_item_id))
        assert(!Item.exists(new_item_id))
        const position = Number.parseInt(position_str)
        assert(position.toString() === position_str)
        assert(!isNaN(position))
        Item.create(new_item_id, parent_item_id)
        Item.update(parent_item_id, parent_item => ({
            ...parent_item,
            subitems: [
                ...parent_item.subitems.slice(0, position),
                new_item_id,
                ...parent_item.subitems.slice(position)
            ]
        }))
        assert(Item.exists(new_item_id))
        assert(new_item_id in Item.get(parent_item_id).subitems)
    }
)
```

We now have our basis covered, since we can define a hierarchy with only theses facts.

### Changing the title of an item

The main feature of an outliner is the ability to edit any item's title. The title is restricted to one line of text.

```ts
Reducer.define(
    /Item (.+)'s title was changed to (".+")/,
    ([ item_id, encoded_title ]) => {
        assert(Item.exists(item_id))
        const title = JSON.parse(encoded_title)
        assert(typeof title === "string")
        assert(title.indexOf("\n") === -1)
        Item.update(item_id, item => ({
            ...item,
            title
        }))
        assert(Item.get(item_id).title === title)
    }
)
```

### Changing the note of an item

The logic for the note associated with an item is exactly the same, except for the one-line restriction which is lifted.

```ts
Reducer.define(
    /Item (.+)'s note was changed to (".+")/,
    ([ item_id, encoded_note ]) => {
        assert(Item.exists(item_id))
        const note = JSON.parse(encoded_note)
        assert(typeof note === "string")
        Item.update(item_id, item => ({
            ...item,
            note
        }))
        assert(Item.get(item_id).note === note)
    }
)
```

### Deleting items

Finally, to complete the CRUD operations, we need the ability to delete an item.

```ts
Reducer.define(
    /Outline (.+) was deleted/,
    ([ item_id, parent_item_id ]) => {
        assert(Item.exists(item_id))
        assert(!Item.get(item_id).parent_id)
        Item.del(item_id)
        assert(!Item.exists(item_id))
    }
)
```


```ts
Reducer.define(
    /Item (.+) was deleted/,
    ([ item_id ]) => {
        assert(Item.exists(item_id))
        const parent_id = Item.get(item_id).parent_id
        assert(Item.exists(parent_id))
        Item.update(parent_id, item => {
            return {
                ...item,
                subitems: item.subitems.filter(id => id !== item_id)
            }
        })
        Item.del(item_id)
        assert(!Item.get(parent_id).subitems.includes(item_id))
        assert(!Item.exists(item_id))
    }
)
```

TODO: we will need to do some garbage collection for subitems of deleted items.

### Moving items around

To really be able to call our tool an outliner, we need one last function: the ability to move items around.

```ts
Reducer.define(
    /Item (.+) was moved inside item (.+) at position (.+)/,
    ([ item_id, new_parent_id, position_str ]) => {
        assert(Item.exists(item_id))
        assert(Item.exists(new_parent_id))
        const old_parent_id = Item.get(item_id).parent_id
        assert(Item.exists(old_parent_id))
        const position = Number.parseInt(position_str)
        assert(position.toString() === position_str)
        assert(!isNaN(position))
        Item.update(item_id, item => ({
            ...item,
            parent_id: new_parent_id
        }))
        Item.update(old_parent_id, old_parent_item => {
            return {
                ...old_parent_item,
                subitems: old_parent_item.subitems.filter(id => id !== item_id)
            }
        })
        Item.update(new_parent_id, new_parent_item => ({
            ...new_parent_item,
            subitems: [
                ...new_parent_item.subitems.slice(0, position),
                item_id,
                ...new_parent_item.subitems.slice(position)
            ]
        }))
        assert(!Item.get(old_parent_id).subitems.includes(item_id))
        assert(Item.get(new_parent_id).subitems.includes(item_id))
    }
)
```
