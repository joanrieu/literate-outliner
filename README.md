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

```js
command(
    /Item (.+) is a new outline/,
    item_id => {
        assert(!Item.exists(item_id))
        Item.create(item_id)
        assert(Item.exists(item_id))
    }
)
```

Most of the time, an item is near other items.

```js
command(
    /Item (.+) is inside item (.+) at position (.+)/,
    (new_item_id, parent_item_id, position) => {
        assert(Item.exists(parent_item_id) && !Item.exists(new_item_id))
        Item.create(new_item_id)
        Item.update(parent_item_id, parent_item => ({
            ...parent_item,
            subitems: {
                ...parent_item.subitems,
                [position]: new_item_id
            }
        }))
        assert(Item.exists(existing_item_id) && Item.exists(new_item_id))
    }
)
```

We now have our basis covered, since we can define a hierarchy with only theses facts.
